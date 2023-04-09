# kevmo314/magic-copy/self-hosting-example

The Meta Segment Anything Model requires running the vision transformer on a server
to generate the image's embeddings. Magic Copy uses the same service that their
demo uses, however some people may not want to send their images to a third party.

This directory contains a simple example of how to self-host the vision transformer
service. It is not meant to be used in production, but rather as a proof of concept
to document the input/output format of the service.

In particular, Magic Copy (and the SAM demo) expect a POST endpoint that accepts
an image file and returns a JSON array of length 1 with the embedding of shape
`(1, 256, 64, 64)` as a base64 encoded string. See the code for specific details on how
to perform this encoding to be compatible with the demo.

## Quick start

If you are looking to quickly get the service running, you can use the provided
Dockerfile to build a container and run it. The container will expose port 8000
and will serve the service at the `/` endpoint.

```bash
docker build -t segment-anything .
docker run --gpus all -p 8000:8000 segment-anything
```

In the Magic Copy chrome extension, you can then change the endpoint to `http://localhost:8000/`.
