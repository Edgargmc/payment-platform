# Payment Platform - Architecture

## Overview

Payment Platform is a backend laboratory designed to learn modern software architecture and cloud-native development.

The project simulates an asynchronous payment processing platform using event-driven architecture and AWS services.

---

# High-Level Architecture

                    +----------------------+
                    |      Client/API      |
                    +----------+-----------+
                               |
                               |
                               ▼
                    +----------------------+
                    |   Payment API        |
                    |      (NestJS)        |
                    +----------+-----------+
                               |
                               |
                               ▼
                    PostgreSQL (RDS)
                               |
                               |
                      Payment + Outbox
                     (Single Transaction)
                               |
                               ▼
                 Outbox Publisher Service
                               |
                               ▼
                      Amazon SQS Queue
                               |
                               ▼
                    Payment Worker
                               |
                               ▼
                    Provider Strategy
                               |
                               ▼
                 External Payment Provider

---

# Main Components

## API

Responsibilities

- Receive payment requests
- Validate input
- Guarantee idempotency
- Persist Payment
- Persist Outbox Event

---

## Outbox Publisher

Responsibilities

- Poll pending outbox events
- Publish messages to SQS
- Mark events as published

---

## Worker

Responsibilities

- Consume SQS messages
- Execute payment provider
- Update payment status

---

## Provider

Current implementation

- Fake Provider

Future

- Prisma
- Stripe
- Mercado Pago
- Fiserv
- Modo

Implemented using Strategy Pattern.

---

# Infrastructure

Development

- Docker Compose
- PostgreSQL
- Redis
- LocalStack

Cloud

- ECS Fargate
- RDS PostgreSQL
- ElastiCache Redis
- Amazon SQS
- CloudWatch
- IAM
- ECR

---

# Patterns

- Clean Architecture
- Repository Pattern
- Outbox Pattern
- Strategy Pattern
- Dependency Injection
- Event Driven Architecture
- Idempotency
- Correlation ID