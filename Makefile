.PHONY: client-build client-dev companion tv-stage tv-package

client-build:
	npm --prefix client run build

client-dev:
	npm --prefix client run dev

companion:
	cd server && go run ./cmd/lumend

tv-stage:
	python3 scripts/stage-webos.py

tv-package:
	python3 scripts/stage-webos.py --package
