# QA-SQL 정확도 및 성능 향상 전략 (Future Study)

> 현재 `qasql/` 파이프라인의 심층 분석에 기반한 개선 방안 도출
> 작성일: 2026-04-19

---

## 1. 현재 아키텍처 분석

### 1.1 파이프라인 구조 (4-Stage)

```
┌─────────────────┐    ┌─────────────────────┐    ┌──────────────┐    ┌──────────────┐
│  SchemaAgent     │ →  │  CandidateGenerator  │ →  │  SQLExecutor  │ →  │  SQLJudge    │
│  (Map-Reduce)    │    │  (5 Strategies)      │    │  (Retry Loop) │    │  (LLM Judge) │
└─────────────────┘    └─────────────────────┘    └──────────────┘    └──────────────┘
```

| Stage | 파일 | 역할 | 현재 방식 |
|-------|------|------|-----------|
| **1. Schema Agent** | `core/schema_agent.py` | 쿼리 분해 + 관련 테이블 식별 | 키워드 매칭 + LLM 점수 병합 |
| **2. Candidate Gen** | `core/generator.py` | 다중 전략으로 SQL 후보 생성 | 5가지 컨텍스트 전략 (hint 없으면 4개) |
| **3. SQL Executor** | `core/executor.py` | 후보 SQL 실행 + 에러 시 리파인 | 최대 3회 LLM 리파인 반복 |
| **4. SQL Judge** | `core/judge.py` | 최적 후보 선택 | LLM-as-a-Judge 패턴 |

### 1.2 현재 강점

- **다전략 후보 생성**: Full Schema / SME / Minimal / Focused / Full Profile — 다양한 관점에서 SQL 생성
- **실행 기반 검증**: 실제 DB에 SQL을 실행하여 문법/런타임 오류 사전 필터링
- **LLM 리파인 루프**: 에러 발생 시 LLM이 SQL을 수정하는 자가교정 메커니즘
- **Last Resort 폴백**: 모든 후보 실패 시 에러 정보를 모아 최종 시도
- **프라이버시 우선**: Ollama 기반 로컬 LLM 기본 지원

### 1.3 핵심 약점 요약

| 영역 | 약점 | 영향 |
|------|------|------|
| Schema Agent | 키워드 매칭이 단순 (substring 기반, 형태소 분석 없음) | 관련 테이블 누락 → SQL 생성 실패 |
| Schema Agent | FK/관계 그래프 미활용 | 필요한 JOIN 테이블 누락 |
| Candidate Gen | temperature=0.0 고정 → 후보 간 다양성 부족 | 같은 오류 반복 |
| Candidate Gen | Few-shot 예시 없음 | 복잡한 쿼리 패턴에 취약 |
| Candidate Gen | 샘플 데이터 미제공 | 값 형식/패턴 파악 불가 |
| Executor | 후보 순차 실행 | 불필요한 지연 |
| Judge | 실행 결과(행 데이터) 미참조 | 의미적 정확성 판단 불가 |
| 전체 | 쿼리 캐싱 / 학습 피드백 루프 없음 | 동일 패턴 재계산 |

---

## 2. 개선 전략

### 2.1 Schema Agent 고도화

#### 2.1.1 스키마 그래프 기반 테이블 탐색

**현재 문제**: 각 테이블을 독립적으로 점수 매기므로, JOIN이 필요한 중간 테이블(bridge table)이 누락됨.

**개선안**: FK 관계를 그래프로 구축하고, 관련 테이블이 식별되면 그 사이의 JOIN 경로에 있는 테이블도 자동 포함.

```python
# 개선 예시 (의사코드)
class SchemaGraph:
    def __init__(self, schema: dict):
        self.graph = self._build_fk_graph(schema)

    def find_join_path(self, table_a: str, table_b: str) -> list[str]:
        """BFS로 두 테이블 간 최단 FK 경로 탐색"""
        return bfs(self.graph, table_a, table_b)

    def expand_relevant_tables(self, tables: list[str]) -> list[str]:
        """관련 테이블 간 브릿지 테이블 자동 포함"""
        expanded = set(tables)
        for a, b in combinations(tables, 2):
            path = self.find_join_path(a, b)
            expanded.update(path)
        return list(expanded)
```

**기대 효과**: 다대다 관계, 중간 테이블이 있는 복잡한 스키마에서 정확도 20-30% 향상 기대

#### 2.1.2 향상된 키워드 매칭

**현재 문제**: `schema_agent.py:208` — `if w in all_text` 는 단순 substring 매칭. "order"로 "order_details"는 찾지만, "주문"으로는 찾지 못함.

**개선안**:
- **형태소 분석기 도입**: 한국어(konlpy), 영어(nltk) 형태소 분석으로 어간 추출
- **동의어 확장**: `sales ↔ revenue ↔ 매출`, `customer ↔ client ↔ 고객` 등
- **편집 거리 기반 퍼지 매칭**: 오타/약어 대응 (e.g., "qty" ↔ "quantity")
- **Embedding 기반 유사도**: 컬럼/테이블 이름을 벡터화하여 의미적 유사도 계산

```python
# 예시: Embedding 기반 유사도
from sentence_transformers import SentenceTransformer

class SemanticMatcher:
    def __init__(self):
        self.model = SentenceTransformer('all-MiniLM-L6-v2')

    def score(self, query_terms: list[str], schema_terms: list[str]) -> float:
        q_emb = self.model.encode(query_terms)
        s_emb = self.model.encode(schema_terms)
        return cosine_similarity(q_emb, s_emb).max()
```

#### 2.1.3 컨텍스트 캐싱

**현재 문제**: 동일 스키마에 대해 매 쿼리마다 모든 테이블을 LLM으로 재평가.

**개선안**: 테이블 설명의 임베딩을 사전 계산하고 캐싱하여, LLM 호출 없이 벡터 유사도로 1차 필터링.

---

### 2.2 Candidate Generator 고도화

#### 2.2.1 Few-Shot 프롬프트 도입

**현재 문제**: `prompts.py`의 모든 전략이 zero-shot. 복잡한 SQL 패턴(서브쿼리, CASE WHEN, 윈도우 함수)에 대한 가이드가 없음.

**개선안**: 쿼리 복잡도별 few-shot 예시 라이브러리를 구축하고 동적으로 삽입.

```python
FEW_SHOT_EXAMPLES = {
    "aggregation": [
        {
            "question": "Show total sales by region",
            "sql": "SELECT region, SUM(amount) as total_sales FROM orders GROUP BY region"
        }
    ],
    "subquery": [
        {
            "question": "Find customers who ordered more than average",
            "sql": "SELECT * FROM customers WHERE id IN (SELECT customer_id FROM orders GROUP BY customer_id HAVING COUNT(*) > (SELECT AVG(cnt) FROM (SELECT COUNT(*) as cnt FROM orders GROUP BY customer_id)))"
        }
    ],
    "window_function": [...],
    "join": [...],
}
```

**쿼리 분류 → 관련 예시 선택 → 프롬프트에 삽입** 파이프라인 필요.

#### 2.2.2 다양성을 위한 Temperature 분산

**현재 문제**: 모든 전략이 `temperature=0.0` → 유사한 SQL이 여러 번 생성됨.

**개선안**: 전략별로 temperature를 차등 적용하여 후보 다양성 확보.

```python
STRATEGY_TEMPERATURES = {
    ContextStrategy.FULL_SCHEMA: 0.0,      # 정밀한 기본 후보
    ContextStrategy.SME_METADATA: 0.0,     # hint는 정확하게
    ContextStrategy.MINIMAL_PROFILE: 0.2,  # 약간의 창의성
    ContextStrategy.FOCUSED_SCHEMA: 0.1,   # 미세 변동
    ContextStrategy.FULL_PROFILE: 0.3,     # 프로파일 기반 탐색
}
```

#### 2.2.3 Chain-of-Thought (CoT) 프롬프트

**현재 문제**: "Generate the SQL query" 라는 단일 지시. 복잡한 쿼리에서 논리적 오류 발생.

**개선안**: 단계별 사고 과정을 유도하여 논리적 정확성 향상.

```
Step 1: 질문에서 필요한 엔티티(테이블)를 식별하세요.
Step 2: 필요한 컬럼과 집계 함수를 결정하세요.
Step 3: 테이블 간 JOIN 조건을 확인하세요.
Step 4: WHERE/HAVING 필터 조건을 설정하세요.
Step 5: 최종 SQL을 작성하세요.
```

**참고 논문**: "Chain-of-Thought Prompting Elicits Reasoning in Large Language Models" (Wei et al., 2022)

#### 2.2.4 샘플 데이터 포함

**현재 문제**: 스키마만 제공하고 실제 데이터 값을 보여주지 않음. LLM이 값 형식(날짜 포맷, ENUM 값 등)을 추론해야 함.

**개선안**: `database.py`의 `get_sample_rows()`로 수집한 샘플 데이터를 프롬프트에 포함.

```python
# generator.py 개선
def _format_with_samples(self, schema: dict) -> str:
    lines = []
    for table_name, table_info in schema.items():
        lines.append(f"Table: {table_name}")
        for col in table_info.get("columns", []):
            lines.append(f"  {col['name']} ({col['type']})")
        # 샘플 행 추가
        samples = table_info.get("sample_rows", [])
        if samples:
            lines.append(f"  Sample data: {samples[:3]}")
    return "\n".join(lines)
```

**특히 중요한 케이스**: 날짜 형식(`YYYY-MM-DD` vs `DD/MM/YYYY`), ENUM 값, NULL 패턴 파악

#### 2.2.5 DB 방언(Dialect) 인식 프롬프트

**현재 문제**: 프롬프트에 DB 종류(SQLite/PostgreSQL/MySQL)를 명시하지 않아, LLM이 잘못된 함수/구문을 사용할 수 있음.

**개선안**: `config.db_type`에 따라 방언별 주의사항을 프롬프트에 삽입.

```python
DIALECT_HINTS = {
    "sqlite": "Use SQLite syntax. No FULL OUTER JOIN. Use || for string concat. Date functions: date(), strftime().",
    "postgresql": "Use PostgreSQL syntax. Use :: for type casting. String concat with ||. Date functions: DATE_TRUNC(), EXTRACT().",
    "mysql": "Use MySQL syntax. Use CONCAT() for strings. Use LIMIT instead of FETCH. Date functions: DATE_FORMAT(), DATEDIFF().",
}
```

---

### 2.3 SQL Executor 개선

#### 2.3.1 후보 병렬 실행

**현재 문제**: `executor.py:68` — `for candidate in candidates:` 순차 실행. 4-5개 후보를 하나씩 실행하면 총 시간이 선형 증가.

**개선안**: `ThreadPoolExecutor`로 병렬 실행. DB connection pool 도입.

```python
def execute_all_candidates_parallel(self, candidates, nl_query, schema_str):
    with ThreadPoolExecutor(max_workers=len(candidates)) as executor:
        futures = {
            executor.submit(self._execute_with_retry, c, nl_query, schema_str): c
            for c in candidates
        }
        return [f.result() for f in as_completed(futures)]
```

**주의**: SQLite는 단일 writer lock이므로 READ-only 쿼리에서만 병렬화 가능. PostgreSQL/MySQL은 connection pool로 병렬 가능.

#### 2.3.2 누적 에러 히스토리 리파인

**현재 문제**: 리파인 시 직전 에러만 전달. 동일한 수정을 반복할 수 있음.

**개선안**: 모든 시도와 에러를 누적하여 LLM에 전달.

```python
def _refine_sql_with_history(self, sql, error_history, schema_str, nl_query):
    history_str = "\n".join([
        f"Attempt {i+1}: {e['sql'][:100]}... → Error: {e['error']}"
        for i, e in enumerate(error_history)
    ])
    # 이전 시도 히스토리를 포함하여 같은 실수 반복 방지
```

#### 2.3.3 결과 유효성 검증 (Semantic Validation)

**현재 문제**: SQL이 실행만 되면 성공으로 간주. `SELECT 1` 같은 무의미한 쿼리도 통과.

**개선안**: 실행 결과의 의미적 유효성 검증 계층 추가.

```python
class ResultValidator:
    def validate(self, result, nl_query) -> bool:
        # 1. 빈 결과 체크 (경고만, 실패는 아님)
        if not result.rows:
            return True  # 빈 결과가 정답일 수 있음

        # 2. 컬럼 수 합리성 체크
        if len(result.columns) == 0:
            return False

        # 3. 집계 질문인데 GROUP BY 없는 단일 행 체크
        # 4. LLM 기반: "이 결과가 질문에 대한 합리적인 답인가?"
```

---

### 2.4 SQL Judge 고도화

#### 2.4.1 실행 결과 기반 판단

**현재 문제**: Judge가 SQL 텍스트만 비교. 실행 결과(행 수, 컬럼명, 샘플 값)를 보지 않음.

**개선안**: 실행 결과의 요약 정보를 Judge 프롬프트에 포함.

```python
# judge.py 개선
def _build_candidate_text(self, candidate, exec_result):
    text = f"Option {candidate.candidate_id} ({candidate.strategy_name}):\n"
    text += f"SQL: {exec_result.sql}\n"
    text += f"Returned: {len(exec_result.rows)} rows, columns: {exec_result.columns}\n"
    if exec_result.rows:
        text += f"Sample output: {exec_result.rows[:3]}\n"
    return text
```

**기대 효과**: "총 매출을 보여줘"에 대해 1행 집계 결과를 반환하는 SQL vs 전체 행을 반환하는 SQL 중 올바른 것을 선택 가능.

#### 2.4.2 다중 Judge 앙상블

**현재 문제**: 단일 LLM 호출로 판단. 불안정.

**개선안**: 여러 관점의 Judge를 병렬 실행하고 다수결로 결정.

```python
JUDGE_PERSPECTIVES = [
    "correctness_judge",   # 질문 의도와의 부합도
    "efficiency_judge",    # SQL 효율성
    "completeness_judge",  # 필요 컬럼/조건 포함 여부
]
```

#### 2.4.3 Self-Consistency (자기 일관성) 검증

**현재 문제**: 후보 간 결과가 다를 때 어느 것이 맞는지 판단이 어려움.

**개선안**: 동일 질문에 대해 다수의 후보가 유사한 결과를 반환하면 그 결과에 더 높은 신뢰도 부여.

```python
def _cross_validate(self, execution_results):
    """결과 간 교차 검증으로 신뢰도 보정"""
    result_hashes = {}
    for r in execution_results:
        if r.success:
            # 결과의 구조적 유사성 해시 (행 수 + 컬럼 수 + 첫 행)
            h = (len(r.rows), len(r.columns), r.rows[0] if r.rows else None)
            result_hashes.setdefault(h, []).append(r.candidate_id)

    # 가장 많은 후보가 동의하는 결과 → 신뢰도 보너스
    consensus = max(result_hashes.values(), key=len)
    return consensus
```

---

### 2.5 전체 시스템 수준 개선

#### 2.5.1 쿼리 캐싱 및 유사 쿼리 재사용

**현재 문제**: 동일하거나 유사한 질문을 반복하면 전체 파이프라인이 재실행됨.

**개선안**: 임베딩 기반 유사 쿼리 캐시.

```python
class QueryCache:
    def __init__(self, threshold=0.92):
        self.cache = []  # [(embedding, question, sql, confidence)]
        self.threshold = threshold

    def find_similar(self, question: str) -> Optional[str]:
        q_emb = self.embed(question)
        for emb, cached_q, sql, conf in self.cache:
            if cosine_similarity(q_emb, emb) > self.threshold:
                return sql
        return None

    def store(self, question, sql, confidence):
        self.cache.append((self.embed(question), question, sql, confidence))
```

#### 2.5.2 사용자 피드백 학습 루프

**현재 문제**: 사용자가 결과를 수정하거나 거부해도, 시스템이 학습하지 않음.

**개선안**: 피드백을 수집하여 few-shot 예시로 활용.

```
[사용자 피드백 루프]
1. 사용자가 결과를 수정 (SQL 직접 편집)
2. (원래 질문, 수정된 SQL) 쌍을 저장
3. 향후 유사 질문 시 few-shot 예시로 삽입
4. 누적되면 fine-tuning 데이터로 활용
```

#### 2.5.3 복합 쿼리 분해 (Query Decomposition)

**현재 문제**: "지난 달 매출이 가장 높은 지역의 고객 수는?" 같은 복합 질문을 단일 SQL로 생성 시도.

**개선안**: 복합 질문을 하위 질문으로 분해하고, 각각 SQL을 생성한 후 합성.

```
원본: "지난 달 매출이 가장 높은 지역의 고객 수는?"
  ↓ 분해
Q1: "지난 달 지역별 매출 합계는?" → SQL1
Q2: "Q1 결과에서 매출이 가장 높은 지역은?" → SQL2 (SQL1의 서브쿼리)
Q3: "해당 지역의 고객 수는?" → SQL3 (SQL2 결합)
  ↓ 합성
최종 SQL: SELECT COUNT(*) FROM customers WHERE region = (
    SELECT region FROM orders WHERE date >= ... GROUP BY region ORDER BY SUM(amount) DESC LIMIT 1
)
```

#### 2.5.4 벤치마크 및 평가 프레임워크

**현재 문제**: 정확도를 객관적으로 측정할 수 없음. 개선 효과를 검증할 기준이 없음.

**개선안**: 표준 NL-to-SQL 벤치마크 기반 자동 평가 시스템 구축.

```python
class Benchmark:
    """Spider, WikiSQL, BIRD 등 표준 벤치마크 실행"""

    def evaluate(self, engine, dataset):
        results = {
            "exact_match": 0,           # SQL 문자열 일치
            "execution_accuracy": 0,     # 실행 결과 일치
            "partial_match": 0,          # 부분 일치 (컬럼, 조건 등)
        }

        for item in dataset:
            predicted = engine.query(item["question"])
            gold_result = self.execute(item["gold_sql"])
            pred_result = self.execute(predicted.sql)

            if gold_result == pred_result:
                results["execution_accuracy"] += 1

        return results
```

**권장 벤치마크**:
- **Spider**: 200+ DB, 10,181 질문 (복잡도 분류 포함)
- **BIRD**: 실제 더러운 데이터 + 도메인 지식 필요
- **WikiSQL**: 대규모 단순 쿼리 벤치마크

---

### 2.6 LLM 활용 최적화

#### 2.6.1 프롬프트 최적화

| 현재 | 개선 |
|------|------|
| 단순 지시문 ("Generate the SQL query") | CoT + Few-shot + 제약조건 명시 |
| DB 방언 미지정 | SQLite/PostgreSQL/MySQL 구문 명시 |
| 스키마만 제공 | 스키마 + 샘플 데이터 + 값 분포 |
| 영어 프롬프트 | 질문 언어에 맞춘 다국어 프롬프트 |

#### 2.6.2 모델 선택 전략

| 단계 | 권장 모델 | 이유 |
|------|-----------|------|
| Schema Agent (점수 매기기) | 소형 모델 (llama3.2:3b) | 빠른 응답, 간단한 판단 |
| Candidate Generation | 대형 모델 (llama3.1:70b 또는 Claude) | SQL 생성 정확도가 핵심 |
| Refinement | 중형 모델 | 에러 수정은 중간 복잡도 |
| Judge | 대형 모델 | 여러 후보 간 미묘한 차이 판단 |

#### 2.6.3 Structured Output (JSON Mode) 활용

**현재 문제**: LLM 응답에서 SQL을 regex로 추출 → 파싱 실패 빈번.

**개선안**: Anthropic/OpenAI의 JSON mode 또는 tool use로 구조화된 응답 강제.

```python
# Anthropic tool use 예시
tools = [{
    "name": "generate_sql",
    "input_schema": {
        "type": "object",
        "properties": {
            "sql": {"type": "string", "description": "The SQL query"},
            "reasoning": {"type": "string", "description": "Brief reasoning"}
        },
        "required": ["sql"]
    }
}]
```

---

## 3. 구현 우선순위 로드맵

### Phase 1: 즉시 적용 가능 (Low Effort, High Impact)

| # | 개선 항목 | 예상 정확도 향상 | 구현 난이도 |
|---|-----------|-----------------|-------------|
| 1 | DB 방언 인식 프롬프트 추가 | +5~10% | ★☆☆ |
| 2 | 샘플 데이터를 프롬프트에 포함 | +5~8% | ★☆☆ |
| 3 | 전략별 Temperature 차등 적용 | +3~5% | ★☆☆ |
| 4 | 누적 에러 히스토리 리파인 | +3~5% | ★☆☆ |
| 5 | Judge에 실행 결과 요약 포함 | +5~10% | ★☆☆ |

### Phase 2: 중기 개선 (Medium Effort)

| # | 개선 항목 | 예상 정확도 향상 | 구현 난이도 |
|---|-----------|-----------------|-------------|
| 6 | Few-shot 예시 라이브러리 | +8~15% | ★★☆ |
| 7 | CoT 프롬프트 도입 | +5~10% | ★★☆ |
| 8 | 후보 병렬 실행 (성능) | 정확도 불변, 속도 3x↑ | ★★☆ |
| 9 | 쿼리 캐싱 | 정확도 불변, 속도 10x↑ | ★★☆ |
| 10 | 스키마 그래프 + JOIN 경로 탐색 | +10~15% | ★★☆ |

### Phase 3: 장기 연구 (High Effort, High Impact)

| # | 개선 항목 | 예상 정확도 향상 | 구현 난이도 |
|---|-----------|-----------------|-------------|
| 11 | Embedding 기반 의미적 스키마 매칭 | +10~20% | ★★★ |
| 12 | 복합 쿼리 분해 (Query Decomposition) | +15~25% | ★★★ |
| 13 | 사용자 피드백 학습 루프 | 점진적 향상 | ★★★ |
| 14 | 벤치마크 평가 프레임워크 | 측정 기반 개선 가능 | ★★★ |
| 15 | Self-Consistency 앙상블 | +5~10% | ★★★ |
| 16 | Structured Output (tool use) | 파싱 실패 90%↓ | ★★☆ |

---

## 4. 참고 논문 및 자료

| 분야 | 논문/자료 | 핵심 아이디어 |
|------|-----------|---------------|
| NL-to-SQL | DIN-SQL (Pourreza & Rafiei, 2023) | 쿼리 분해 + 자기수정 |
| NL-to-SQL | DAIL-SQL (Gao et al., 2023) | 효율적 few-shot 선택 |
| NL-to-SQL | C3 (Dong et al., 2023) | ChatGPT 기반 zero-shot + 보정 |
| NL-to-SQL | CHESS (Talaei et al., 2024) | 스키마 필터링 + CoT |
| 프롬프트 | Chain-of-Thought (Wei et al., 2022) | 단계별 추론 유도 |
| 프롬프트 | Self-Consistency (Wang et al., 2023) | 다수결 기반 신뢰도 |
| 벤치마크 | Spider (Yu et al., 2018) | 표준 NL-to-SQL 평가 |
| 벤치마크 | BIRD (Li et al., 2023) | 실제 데이터 + 도메인 지식 |

---

## 5. 결론

현재 QA-SQL의 4-Stage 파이프라인은 견고한 기반을 갖추고 있으나, **스키마 이해 깊이**, **프롬프트 정교함**, **후보 다양성**, **결과 검증** 네 가지 축에서 개선 여지가 크다.

**가장 큰 ROI를 낼 수 있는 Top 3 개선**:

1. **Few-shot + CoT 프롬프트 도입** (Phase 2) — 가장 적은 코드 변경으로 가장 큰 정확도 향상
2. **스키마 그래프 기반 JOIN 경로 탐색** (Phase 2) — 다중 테이블 쿼리 정확도 대폭 향상
3. **Judge에 실행 결과 포함** (Phase 1) — 의미적 정확성 판단 능력 확보

이 세 가지를 순차적으로 적용하면, 현재 파이프라인 대비 **20~40% 정확도 향상**이 기대된다.
