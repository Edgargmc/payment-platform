# Payment Platform

A simplified event-driven payment platform built with NestJS, PostgreSQL, Redis and Docker, designed to demonstrate real-world backend engineering patterns commonly used in fintech and payment processing systems.

## Overview

This project simulates the lifecycle of a payment transaction from creation to processing using asynchronous event-driven architecture.

Key concepts implemented:

* Idempotency
* Outbox Pattern
* Background Workers
* Event-Driven Processing
* Redis Caching
* PostgreSQL Persistence
* Health Checks
* Dockerized Deployment
* Cloud-Native Configuration

---

## Architecture

```text
Client
  │
  ▼
Payment API (NestJS)
  │
  ├── Validation
  ├── Idempotency
  └── Persistence
          │
          ▼
     PostgreSQL
          │
          ▼
     Outbox Events
          │
          ▼
   Worker Process
          │
          ▼
 Provider Connector
          │
          ▼
APPROVED | REJECTED | PENDING
```

---

## Features

### Payment Creation

```http
POST /payments
```

Creates a payment request and stores an associated outbox event in a single database transaction.

### Payment Query

```http
GET /payments/{id}
```

Retrieves the current status of a payment.

### Health Endpoints

```http
GET /health
GET /health/ready
```

Provides liveness and readiness information for monitoring and orchestration platforms.

---

## Implemented Patterns

### Idempotency

Prevents duplicate payment creation by using an `idempotencyKey`.

Flow:

```text
Request
  │
  ▼
Redis Cache
  │
  ├── HIT  → Return Existing Payment
  │
  └── MISS
          │
          ▼
     PostgreSQL
```

---

### Outbox Pattern

Guarantees reliable event generation.

```text
BEGIN TRANSACTION

INSERT Payment
INSERT Outbox Event

COMMIT
```

Prevents data inconsistencies when publishing asynchronous events.

---

### Worker Pattern

Background worker continuously processes pending outbox events.

Responsibilities:

* Read pending events
* Process payments
* Update payment status
* Mark events as processed

---

### Graceful Degradation

Redis is treated as an optimization layer rather than a critical dependency.

```text
Redis DOWN
      ↓
Fallback to PostgreSQL
      ↓
Service remains available
```

---

## Technology Stack

### Backend

* Node.js 20
* NestJS
* TypeScript

### Persistence

* PostgreSQL 16
* Redis 7

### Infrastructure

* Docker
* Docker Compose

### ORM

* TypeORM

### Validation

* class-validator
* class-transformer

---

## Project Structure

```text
src
├── health
│   ├── health.controller.ts
│   └── health.service.ts
│
├── payments
│   ├── dto
│   ├── payment.entity.ts
│   ├── outbox-event.entity.ts
│   ├── payments.controller.ts
│   ├── payments.service.ts
│   ├── provider-connector.service.ts
│   ├── outbox-worker.service.ts
│   └── idempotency-cache.service.ts
│
├── app.module.ts
├── main.ts
└── worker.ts
```

---

## Local Development

Start infrastructure:

```bash
docker compose up -d postgres redis
```

Start API:

```bash
npm run start:api
```

Start Worker:

```bash
npm run start:worker
```

---

## Full Docker Environment

```bash
docker compose up --build
```

---

## Example Request

```http
POST /payments
```

```json
{
  "idempotencyKey": "payment-001",
  "customerId": "customer-123",
  "merchantId": "merchant-456",
  "qrData": "000201010212...",
  "amountInCents": 150050,
  "currency": "ARS"
}
```

---

## Payment Statuses

| Status     | Description                                |
| ---------- | ------------------------------------------ |
| PROCESSING | Payment created and waiting for processing |
| PENDING    | Final provider status is unknown           |
| APPROVED   | Payment successfully processed             |
| REJECTED   | Business rejection from provider           |
| FAILED     | Technical failure requiring investigation  |

---

## Future Improvements

* AWS ECS/Fargate deployment
* Amazon RDS PostgreSQL
* ElastiCache Redis
* Amazon SQS integration
* OpenTelemetry tracing
* Prometheus metrics
* Circuit Breaker
* Retry Policies
* Dead Letter Queues
* CI/CD Pipeline
* Automated Testing
* Event Versioning
* Multi-provider Routing

---

## Learning Goals

This project was created as a hands-on learning platform for:

* Backend Engineering
* Distributed Systems
* Payment Processing
* Cloud Architecture
* AWS
* System Design
* Event-Driven Systems
* Fintech Architecture
