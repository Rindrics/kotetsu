FROM debian:bookworm-slim

RUN apt-get update && \
    apt-get install -y --no-install-recommends biber && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /work

ENTRYPOINT ["biber"]
