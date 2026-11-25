import React, { useMemo, useState } from "react";
import { Checkbox, Button, Input, InputGroup, InputLeftElement, InputRightElement } from "@chakra-ui/react";

import styles from "./permissionMatrix.module.css";
import {
  PERMISSION_MODULES,
  TOTAL_PERMISSION_COUNT,
  countEnabledPermissions,
} from "../../util/permissionCatalog";

function highlight(text, query) {
  if (!query) return text;
  const index = text.toLowerCase().indexOf(query.toLowerCase());
  if (index === -1) return text;
  return (
    <>
      {text.slice(0, index)}
      <mark className={styles.mark}>
        {text.slice(index, index + query.length)}
      </mark>
      {text.slice(index + query.length)}
    </>
  );
}

/**
 * Compact, searchable accordion view of the permission catalog.
 *
 * Purely presentational: the selected permission keys and every change flow
 * through the props, so the submitted payload is unchanged.
 */
function PermissionMatrix({ permissions, onToggle, onToggleModule }) {
  const [query, setQuery] = useState("");
  const [openModules, setOpenModules] = useState({});

  const selected = useMemo(() => new Set(permissions), [permissions]);
  const enabledCount = useMemo(
    () => countEnabledPermissions(permissions),
    [permissions]
  );

  const trimmedQuery = query.trim();
  const isSearching = trimmedQuery.length > 0;

  const visibleModules = useMemo(() => {
    if (!isSearching) {
      return PERMISSION_MODULES.map((module) => ({
        ...module,
        visiblePermissions: module.permissions,
      }));
    }

    const needle = trimmedQuery.toLowerCase();

    return PERMISSION_MODULES.map((module) => {
      const moduleMatches = module.title.toLowerCase().includes(needle);
      const matched = module.permissions.filter(
        (permission) =>
          permission.label.toLowerCase().includes(needle) ||
          permission.key.toLowerCase().includes(needle)
      );

      return {
        ...module,
        visiblePermissions: moduleMatches ? module.permissions : matched,
      };
    }).filter((module) => module.visiblePermissions.length > 0);
  }, [isSearching, trimmedQuery]);

  const toggleModule = (moduleId) => {
    setOpenModules((prev) => ({ ...prev, [moduleId]: !prev[moduleId] }));
  };

  const setAllModules = (isOpen) => {
    const next = {};
    PERMISSION_MODULES.forEach((module) => {
      next[module.id] = isOpen;
    });
    setOpenModules(next);
  };

  const progress = TOTAL_PERMISSION_COUNT
    ? Math.round((enabledCount / TOTAL_PERMISSION_COUNT) * 100)
    : 0;

  return (
    <div className={styles.wrapper}>
      <div className={styles.toolbar}>
        <div className={styles.summary}>
          <span className={styles.summaryCount}>
            {enabledCount} / {TOTAL_PERMISSION_COUNT}
          </span>
          <span className={styles.summaryLabel}>permissions enabled</span>
          <span className={styles.progressTrack}>
            <span
              className={styles.progressBar}
              style={{ width: `${progress}%` }}
            />
          </span>
        </div>

        <div className={styles.toolbarActions}>
          <InputGroup size="sm" className={styles.searchGroup}>
            <InputLeftElement pointerEvents="none" height="34px">
              <i className={`fa fa-search ${styles.searchIcon}`} />
            </InputLeftElement>
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search permissions or modules"
              height="34px"
              borderRadius="6px"
              fontSize="sm"
              bg="white"
            />
            {query ? (
              <InputRightElement height="34px">
                <button
                  type="button"
                  aria-label="Clear search"
                  className={styles.clearButton}
                  onClick={() => setQuery("")}
                >
                  <i className="fa fa-times" />
                </button>
              </InputRightElement>
            ) : null}
          </InputGroup>

          <Button
            type="button"
            size="xs"
            variant="ghost"
            colorScheme="purple"
            onClick={() => setAllModules(true)}
          >
            Expand all
          </Button>
          <Button
            type="button"
            size="xs"
            variant="ghost"
            colorScheme="purple"
            onClick={() => setAllModules(false)}
          >
            Collapse all
          </Button>
        </div>
      </div>

      {visibleModules.length === 0 ? (
        <div className={styles.emptyState}>
          <i className="fa fa-search" />
          <span>No permissions match “{trimmedQuery}”</span>
        </div>
      ) : null}

      <div className={styles.moduleList}>
        {visibleModules.map((module) => {
          const moduleKeys = module.permissions.map((p) => p.key);
          const moduleEnabled = moduleKeys.filter((key) =>
            selected.has(key)
          ).length;
          const isOpen = isSearching || !!openModules[module.id];

          // While searching, "Select all" acts on the permissions actually on
          // screen so nothing hidden is toggled by accident.
          const targetKeys = isSearching
            ? module.visiblePermissions.map((p) => p.key)
            : moduleKeys;
          const targetEnabled = targetKeys.filter((key) =>
            selected.has(key)
          ).length;
          const allSelected =
            targetKeys.length > 0 && targetEnabled === targetKeys.length;
          const someSelected = targetEnabled > 0 && !allSelected;

          return (
            <section
              key={module.id}
              className={`${styles.module} ${isOpen ? styles.moduleOpen : ""}`}
            >
              <div
                role="button"
                tabIndex={0}
                aria-expanded={isOpen}
                className={styles.moduleHeader}
                onClick={() => toggleModule(module.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    toggleModule(module.id);
                  }
                }}
              >
                <i
                  className={`fa ${
                    isOpen ? "fa-chevron-down" : "fa-chevron-right"
                  } ${styles.chevron}`}
                />
                <i className={`fa ${module.icon} ${styles.moduleIcon}`} />
                <span className={styles.moduleTitle}>
                  {highlight(module.title, trimmedQuery)}
                </span>
                <span
                  className={`${styles.moduleCount} ${
                    moduleEnabled > 0 ? styles.moduleCountActive : ""
                  }`}
                >
                  {moduleEnabled}/{moduleKeys.length} enabled
                </span>

                <span
                  className={styles.selectAll}
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => e.stopPropagation()}
                >
                  <Checkbox
                    size="sm"
                    colorScheme="purple"
                    isChecked={allSelected}
                    isIndeterminate={someSelected}
                    title={
                      isSearching
                        ? "Select all matching permissions"
                        : "Select all permissions in this module"
                    }
                    onChange={(e) =>
                      onToggleModule(targetKeys, e.target.checked)
                    }
                  >
                    <span className={styles.selectAllLabel}>Select all</span>
                  </Checkbox>
                </span>
              </div>

              {isOpen ? (
                <div className={styles.permissionGrid}>
                  {module.visiblePermissions.map((permission) => (
                    <Checkbox
                      key={permission.key}
                      size="sm"
                      colorScheme="purple"
                      className={styles.permission}
                      isChecked={selected.has(permission.key)}
                      onChange={(e) =>
                        onToggle(permission.key, e.target.checked)
                      }
                    >
                      <span className={styles.permissionLabel}>
                        {highlight(permission.label, trimmedQuery)}
                      </span>
                    </Checkbox>
                  ))}
                </div>
              ) : null}
            </section>
          );
        })}
      </div>
    </div>
  );
}

export default PermissionMatrix;
