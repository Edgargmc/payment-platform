# Payment Platform

A production-inspired payment processing platform built with NestJS, PostgreSQL, Redis and AWS messaging patterns.

The project demonstrates how modern fintech systems handle idempotency, reliable event publishing, asynchronous processing, distributed messaging, dead-letter queues, and consumer resiliency using real-world architectural patterns.

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
  ▼
PostgreSQL
  │
  ▼
Outbox Pattern
  │
  ▼
Outbox Publisher
  │
  ▼
Amazon SQS
  │
  ▼
Payment Consumer
  │
  ▼
Provider Connector
  │
  ▼
APPROVED | REJECTED | PENDING

               │
               ▼
            DLQ
```

---

## Features

### Distributed Messaging

Amazon SQS integration using AWS SDK.

Features:

- Asynchronous event delivery
  - Dead Letter Queue (DLQ)
  - Retry handling
  - At-Least-Once delivery semantics
  - Consumer resiliency
  - 
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
### Consumer Idempotency

SQS Standard queues provide At-Least-Once delivery guarantees.

To prevent duplicate processing:

- processed_messages table
- payment state validation
- duplicate event detection

This ensures payment operations remain safe even when messages are delivered multiple times.

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
│   ├── outbox-publisher.service.ts
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

- Amazon ECS / Fargate deployment
- Amazon RDS PostgreSQL
- Amazon ElastiCache Redis
- AWS Secrets Manager
- OpenTelemetry
- Prometheus / Grafana
- Circuit Breaker Pattern
- Infrastructure as Code (Terraform)
- Multi-region failover
---
## AWS Concepts Implemented

- Amazon SQS
- Dead Letter Queues (DLQ)
- AWS SDK v3
- Queue Consumers
- Queue Publishers
- Event-Driven Architecture
- Distributed Systems Patterns
- Cloud-Native Service Design

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
