# Requirements Document

## Introduction

This document specifies requirements for a new `POST /habilitados` endpoint in the existing Malla INF REST service. The endpoint receives a list of course codes that a student has already passed and returns all catalog courses whose prerequisites are fully covered by that set, excluding courses the student has already passed. The feature also addresses three confirmed security vulnerabilities (DoS via oversized input, internal stack trace exposure, and incorrect handling of a non-array body) and enforces CI/CD quality gates for coverage, dependency auditing, and secret scanning.

## Glossary

- **API**: The Express REST service defined in `src/app.js` and mounted routes.
- **Aprobados**: The JSON array of course ID strings provided by the caller, representing courses the student has already passed.
- **Catalog**: The full set of courses loaded from `data/cursos.json` by the Repositorio.
- **Habilitado**: A course from the Catalog that is not in Aprobados and whose every prerequisite ID is contained in Aprobados.
- **Repositorio**: The data-access module at `src/data/repositorio.js` that exposes `listar()`, `listarPorCiclo()`, and `obtener()`.
- **Validator**: The input-validation logic applied to every incoming request to `POST /habilitados`.
- **Pipeline**: The GitHub Actions CI/CD workflow defined in `.github/workflows/ci.yml`.

## Requirements

### Requirement 1: Compute enabled courses

**User Story:** As a student, I want to submit the list of courses I have already passed and receive back the courses I am now eligible to take, so that I can plan my next semester.

#### Acceptance Criteria

1. WHEN a `POST /habilitados` request is received with a valid `aprobados` array, THE API SHALL respond with HTTP 200 and a JSON array containing every Habilitado course from the Catalog.
2. WHEN computing Habilitados, THE API SHALL include a course only if every element of its `prerequisites` array is present in the Aprobados set provided in the request.
3. WHEN computing Habilitados, THE API SHALL exclude every course whose ID appears in the Aprobados set provided in the request.
4. WHEN a course in the Catalog has an empty `prerequisites` array, THE API SHALL treat that course as Habilitado provided its ID is not in Aprobados.
5. WHEN a `POST /habilitados` request is received with `aprobados` equal to `["1INF25","1INF27","1INF49"]`, THE API SHALL return a JSON array of exactly 27 courses that includes courses with IDs `1INF29`, `1INF30`, `1INF31`, and `1INF32`.

### Requirement 2: Input validation — array type

**User Story:** As an API operator, I want the endpoint to reject non-array values for `aprobados`, so that clients receive a clear error instead of incorrect results.

#### Acceptance Criteria

1. IF the request body contains an `aprobados` field whose JSON type is not an array, THEN THE Validator SHALL respond with HTTP 400 and a JSON object containing an `error` field.
2. IF the request body does not contain an `aprobados` field, THEN THE Validator SHALL respond with HTTP 400 and a JSON object containing an `error` field.
3. IF the `Content-Type` header is not `application/json` or the body is not parseable as JSON, THEN THE Validator SHALL respond with HTTP 400 and a JSON object containing an `error` field.

### Requirement 3: Input validation — maximum list size

**User Story:** As an API operator, I want the endpoint to reject excessively large `aprobados` lists, so that a single malformed request cannot cause a denial-of-service condition. (The catalog has 87 courses, so 100 elements gives a reasonable margin above the realistic maximum of 87 while cutting off inputs like 5 000 elements.)

#### Acceptance Criteria

1. IF the `aprobados` array contains more than 100 elements, THEN THE Validator SHALL respond with HTTP 400 and a JSON object containing an `error` field.
2. WHEN the `aprobados` array contains between 0 and 100 elements, THE Validator SHALL allow the request to proceed to the computation step.
3. WHEN the `aprobados` array contains 100 elements, THE API SHALL respond in less than 500 ms.

### Requirement 4: Input validation — element format

**User Story:** As an API operator, I want each element of `aprobados` to be a non-empty string, so that code injection payloads are rejected before reaching any processing logic.

#### Acceptance Criteria

1. IF any element of the `aprobados` array is not a string, THEN THE Validator SHALL respond with HTTP 400 and a JSON object containing an `error` field.
2. IF any element of the `aprobados` array is an empty string, THEN THE Validator SHALL respond with HTTP 400 and a JSON object containing an `error` field.
3. IF any element of the `aprobados` array does not match the pattern `^[0-9][A-Z]{3}[0-9]{2}$`, THEN THE Validator SHALL respond with HTTP 400 and a JSON object containing an `error` field that does not echo the invalid value.

### Requirement 5: Error response — no internal detail exposure

**User Story:** As a security engineer, I want error responses to omit stack traces, file paths, and internal module names, so that an attacker gains no information about the server's internal structure.

#### Acceptance Criteria

1. WHEN THE API responds with any HTTP 4xx or 5xx status, THE API SHALL include only an `error` string field in the JSON body and SHALL NOT include stack traces, file-system paths, or module names.
2. WHEN an unhandled exception occurs during request processing, THE API SHALL respond with HTTP 500 and a body of `{"error": "Internal server error"}` without exposing exception details (verified by mocking `repositorio.listar` to throw).

### Requirement 6: Code coverage gate

**User Story:** As a CI engineer, I want the pipeline to enforce a minimum line-coverage threshold, so that untested code cannot be merged.

#### Acceptance Criteria

1. WHEN the Pipeline executes the test suite, THE Pipeline SHALL fail if the Jest line-coverage percentage falls below 80%.
2. WHEN the Pipeline executes the test suite with line coverage at or above 80%, THE Pipeline SHALL report a passing coverage check.

### Requirement 7: Dependency vulnerability gate

**User Story:** As a CI engineer, I want the pipeline to block merges when npm dependencies carry high or critical vulnerabilities, so that known vulnerable packages are not shipped.

#### Acceptance Criteria

1. WHEN the Pipeline runs `npm audit`, THE Pipeline SHALL fail if any dependency has a severity level of `high` or `critical`.
2. WHEN the Pipeline runs `npm audit` and no dependency has a severity level of `high` or `critical`, THE Pipeline SHALL report a passing audit check.

### Requirement 8: Secret scanning gate

**User Story:** As a CI engineer, I want the pipeline to detect secrets committed to the repository, so that credentials are never shipped in source code.

#### Acceptance Criteria

1. WHEN the Pipeline runs `gitleaks`, THE Pipeline SHALL fail if any secret pattern is detected in the repository history.
2. WHEN the Pipeline runs `gitleaks` and no secret pattern is detected, THE Pipeline SHALL report a passing scan.
