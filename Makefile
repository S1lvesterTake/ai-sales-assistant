.PHONY: dev prod down reset logs seed

## Start in development mode (hot-reload, volume mounts)
dev:
	docker compose up --build

## Start in production mode (compiled images, no volume mounts)
prod:
	docker compose -f docker-compose.prod.yml up --build

## Stop all running containers
down:
	docker compose down

## Stop and wipe all volumes (fresh database)
reset:
	docker compose down -v
	docker compose -f docker-compose.prod.yml down -v

## Follow logs from all services
logs:
	docker compose logs -f

## Re-run the demo seed against the running dev stack
seed:
	docker compose exec backend node dist/src/database/seeds/demo.seed.js seed
