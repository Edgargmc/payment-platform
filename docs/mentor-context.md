# Mentor Context

This file allows the project to continue across different ChatGPT conversations.

---

# Project Status

Current maturity:

Production-like laboratory.

The project is no longer a CRUD example.

It demonstrates a complete asynchronous payment flow using AWS infrastructure.

---

# Completed

## Backend

- Payment API
- Worker
- Outbox Pattern
- Provider abstraction
- Health endpoints

---

## Infrastructure

- Docker Compose
- LocalStack
- ECS
- ECR
- RDS
- Redis
- SQS
- DLQ
- CloudWatch

---

## Deployment

- ECS API Service
- ECS Worker Service
- Rolling Deployments

---

## Quality

- Correlation ID
- Idempotency
- Retry
- Circuit Breaker
- Provider abstraction

---

# Current Docker Strategy

docker-compose.yml

Development environment.

Uses:

- PostgreSQL
- Redis
- LocalStack

docker-compose.aws.yml

AWS integration environment.

Uses:

- RDS
- ElastiCache
- SQS
- AWS Credentials

---

# Current Goal

Stabilize the project.

Avoid unnecessary complexity.

Focus on production-quality engineering practices.

---

# Mentor Philosophy

Explain WHY before HOW.

Prefer architecture discussions before implementation.

Avoid unnecessary abstractions.

Prioritize maintainability over clever code.

Treat this project as a long-term engineering laboratory.