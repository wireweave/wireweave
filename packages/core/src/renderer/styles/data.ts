/**
 * Data component styles (Table, List)
 */

import type { ThemeConfig } from '../types'

export function generateDataStyles(_theme: ThemeConfig, prefix: string): string {
  return `/* Data Components */
.${prefix}-table {
  display: table;
  width: 100%;
  border-collapse: collapse;
  border: 1px solid var(--${prefix}-border);
  font-size: 14px;
}

.${prefix}-table thead {
  display: table-header-group;
}

.${prefix}-table tbody {
  display: table-row-group;
}

.${prefix}-table tr {
  display: table-row;
}

.${prefix}-table th,
.${prefix}-table td {
  display: table-cell;
  padding: 10px 12px;
  text-align: left;
  line-height: 1.5;
  vertical-align: top;
  border-bottom: 1px solid var(--${prefix}-border);
}

.${prefix}-table th {
  background: rgba(0, 0, 0, 0.02);
  font-weight: 600;
}

.${prefix}-table-bordered th,
.${prefix}-table-bordered td {
  border: 1px solid var(--${prefix}-border);
}

.${prefix}-table-striped tbody tr:nth-child(odd) {
  background: rgba(0, 0, 0, 0.02);
}

.${prefix}-table-hover tbody tr:hover {
  background: rgba(0, 0, 0, 0.04);
}

.${prefix}-list {
  display: block;
  list-style: none;
  padding: 0;
  margin: 0;
}

.${prefix}-list-ordered {
  list-style: decimal;
  padding-left: 24px;
}

.${prefix}-list-ordered .${prefix}-list-item {
  display: list-item;
  list-style: decimal;
}

.${prefix}-list-none {
  list-style: none;
}

.${prefix}-list-item {
  display: list-item;
  padding: 8px 0;
  border-bottom: 1px solid var(--${prefix}-border);
}

.${prefix}-list-item:last-child {
  border-bottom: none;
}`
}
