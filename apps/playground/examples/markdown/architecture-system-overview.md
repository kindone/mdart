# System Architecture

The platform is divided into three layers.

```mdart layered-arch
title: Platform Layers

- Presentation
  - Web app
  - Mobile app
  - Public API
- Application
  - Auth service
  - Worker service
  - Scheduler
- Data
  - Postgres
  - Redis
  - Object storage
```

All inter-service communication goes through the application layer.
