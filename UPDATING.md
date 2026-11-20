# Updating the upstream version

Upstream is the `josh5/unmanic` Docker image, published by the Unmanic project for every GitHub release.

## Determining the upstream version

```bash
gh release view -R Unmanic/unmanic --json tagName -q .tagName
curl -s https://hub.docker.com/v2/repositories/josh5/unmanic/tags/<version> | jq '.images[].architecture'
```

Release tags carry no `v` prefix. Use a version only once its image tag lists both `amd64` and `arm64`.

## Applying the bump

Set `unmanicVersion` in `startos/manifest/index.ts`. Both build variants pack the same image, so that one constant moves both.
