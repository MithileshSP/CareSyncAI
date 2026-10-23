# Stage 1: Build Go Backend
FROM golang:1.24-alpine AS be
WORKDIR /app
COPY go.mod go.sum* ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -o /caresync .

# Stage 2: Minimal Production Image
FROM alpine:3.20
WORKDIR /app
RUN apk --no-cache add ca-certificates curl
COPY --from=be /caresync .
COPY web ./web
EXPOSE 8080
CMD ["./caresync"]
