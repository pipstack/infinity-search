FROM golang:1.27-alpine AS builder

WORKDIR /src

COPY go.mod go.sum ./
RUN go mod download

COPY backend ./backend
COPY index.html script.js style.css ./

RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 \
    go build -trimpath -ldflags="-s -w" \
    -o /out/local-search-server ./backend


FROM alpine:3.22

RUN apk add --no-cache ca-certificates \
    && addgroup -S app \
    && adduser -S -G app app \
    && mkdir -p /data \
    && chown -R app:app /data

WORKDIR /app

COPY --from=builder /out/local-search-server /app/local-search-server
COPY --from=builder /src/index.html /app/index.html
COPY --from=builder /src/script.js /app/script.js
COPY --from=builder /src/style.css /app/style.css

RUN chown -R app:app /app

USER app

VOLUME ["/data"]

EXPOSE 8080

ENTRYPOINT ["/app/local-search-server"]
