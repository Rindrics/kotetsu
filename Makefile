CONTENTS_DIR = contents
BIB_FILE = $(CONTENTS_DIR)/references.bib
YAML_FILE = $(CONTENTS_DIR)/custom_info.yaml
DOCKER_RUN = docker run --rm -v $(PWD):/work -w /work
BIBER_IMAGE = ghcr.io/rindrics/kotetsu/biber:latest

.PHONY: format format-check lint check ci clean import build-biber validate-sync

import:
	@for f in $(CONTENTS_DIR)/*.bibtex; do \
		if [ -f "$$f" ]; then \
			cat "$$f" >> $(BIB_FILE); \
			rm "$$f"; \
			echo "Imported: $$f"; \
		fi; \
	done

format:
	cat $(BIB_FILE) | $(DOCKER_RUN) -i node:20-alpine npx bibtex-tidy --curly --numeric --sort-fields --no-align --sort --trailing-commas > $(BIB_FILE).tmp
	mv $(BIB_FILE).tmp $(BIB_FILE)

format-check:
	@cat $(BIB_FILE) | $(DOCKER_RUN) -i node:20-alpine npx bibtex-tidy --curly --numeric --sort-fields --no-align --sort --trailing-commas > $(BIB_FILE).tmp
	@diff -q $(BIB_FILE) $(BIB_FILE).tmp > /dev/null || (echo "ERROR: File needs formatting. Run 'make format'"; rm -f $(BIB_FILE).tmp; exit 1)
	@rm -f $(BIB_FILE).tmp
	@echo "OK: File is properly formatted"

lint: build-biber
	@$(DOCKER_RUN) $(BIBER_IMAGE) --tool --validate-datamodel $(BIB_FILE) 2>&1 | tee $(BIB_FILE).lint.log
	@! grep -q '^WARN - \|^ERROR - ' $(BIB_FILE).lint.log || (echo "ERROR: Validation issues found"; rm -f $(BIB_FILE).lint.log; exit 1)
	@rm -f $(BIB_FILE).lint.log references_bibertool.bib
	@echo "OK: Validation passed"

check: format lint

ci: format-check lint validate-sync

validate-sync:
	@echo "Checking key sync between $(BIB_FILE) and $(YAML_FILE)..."
	@BIB_KEYS=$$(grep -oE '^@[a-z]+\{[^,]+' $(BIB_FILE) | sed 's/^@[a-z]*{//'); \
	YAML_KEYS=$$($(DOCKER_RUN) node:20-alpine sh -c "npx -y js-yaml $(YAML_FILE) | npx -y json -k" 2>/dev/null | tr -d '[]," '); \
	ORPHANS=""; \
	for key in $$YAML_KEYS; do \
		if ! echo "$$BIB_KEYS" | grep -qF "$$key"; then \
			ORPHANS="$$ORPHANS $$key"; \
		fi; \
	done; \
	if [ -n "$$ORPHANS" ]; then \
		echo "ERROR: Orphan keys in $(YAML_FILE):$$ORPHANS"; \
		exit 1; \
	fi; \
	echo "OK: All keys in $(YAML_FILE) exist in $(BIB_FILE)"

clean:
	rm -f $(BIB_FILE).blg $(BIB_FILE).tmp $(BIB_FILE).lint.log references_bibertool.bib
