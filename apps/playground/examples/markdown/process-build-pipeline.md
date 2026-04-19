# Deployment Pipeline

Our standard release process moves code from commit to production
through four automated gates.

```mdart process
title: Release Pipeline

Plan → Code → Review → Test → Deploy
```

Each stage must pass before the next begins.
