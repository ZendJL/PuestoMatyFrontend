import { useMemo, useState } from 'react';

export default function DataTable({
  columns,
  data,
  initialSort = null,
  maxHeight = 320,
  onRowClick,
  getRowKey = (row) => row.id,
  striped = true,
  small = true,
  selectedRowKey = null,          // <- NUEVA PROP
}) {
  const [sortConfig, setSortConfig] = useState(initialSort);
  const [filters, setFilters] = useState({});

  const handleSort = (id) => {
    setSortConfig((prev) => {
      if (prev?.id === id) {
        return { id, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      const col = columns.find((c) => c.id === id);
      const defaultDir = col?.defaultSortDirection || 'asc';
      return { id, direction: defaultDir };
    });
  };

  const handleFilterChange = (id, value) => {
    setFilters((prev) => ({ ...prev, [id]: value }));
  };

  const filteredAndSorted = useMemo(() => {
    let rows = Array.isArray(data) ? [...data] : [];

    Object.entries(filters).forEach(([id, value]) => {
      if (!value) return;
      const col = columns.find((c) => c.id === id);
      if (!col) return;
      const texto = value.toLowerCase();
      rows = rows.filter((row) => {
        const raw = col.accessor ? col.accessor(row) : row[id];
        const str =
          raw === null || raw === undefined ? '' : String(raw).toLowerCase();
        return str.includes(texto);
      });
    });

    if (sortConfig?.id) {
      const col = columns.find((c) => c.id === sortConfig.id);
      if (col) {
        const dir = sortConfig.direction === 'asc' ? 1 : -1;
        rows.sort((a, b) => {
          const av = col.accessor ? col.accessor(a) : a[col.id];
          const bv = col.accessor ? col.accessor(b) : b[col.id];

          if (col.sortFn) return dir * col.sortFn(av, bv, a, b);

          let vA = av;
          let vB = bv;
          if (typeof vA === 'string') vA = vA.toLowerCase();
          if (typeof vB === 'string') vB = vB.toLowerCase();

          if (vA < vB) return -1 * dir;
          if (vA > vB) return 1 * dir;
          return 0;
        });
      }
    }

    return rows;
  }, [data, filters, sortConfig, columns]);

  const renderSortIcon = (id) => {
    if (sortConfig?.id !== id) {
      return <span className="text-body-secondary ms-1">↕</span>;
    }
    return (
      <span className="ms-1">
        {sortConfig.direction === 'asc' ? '▲' : '▼'}
      </span>
    );
  };

  return (
    <div
      className="table-responsive"
      style={{ maxHeight, overflowY: 'auto' }}
    >
      <table
        className={[
          'table',
          striped ? 'table-striped' : '',
          small ? 'table-sm' : '',
          'mb-0',
          'align-middle',
          'fs-6',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <thead className="sticky-top">
          <tr>
            {columns.map((col) => (
              <th
                key={col.id}
                style={col.style}
                className={col.headerClassName}
                onClick={
                  col.sortable ? () => handleSort(col.id) : undefined
                }
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent:
                      col.headerAlign === 'right'
                        ? 'flex-end'
                        : col.headerAlign === 'center'
                        ? 'center'
                        : 'flex-start',
                    cursor: col.sortable ? 'pointer' : 'default',
                  }}
                >
                  <span>{col.header}</span>
                  {col.sortable && renderSortIcon(col.id)}
                </div>
              </th>
            ))}
          </tr>
          <tr>
            {columns.map((col) => (
              <th key={col.id} style={col.style}>
                {col.filterable && (
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    placeholder={col.filterPlaceholder || ''}
                    value={filters[col.id] || ''}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) =>
                      handleFilterChange(col.id, e.target.value)
                    }
                  />
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filteredAndSorted.map((row) => {
            const key = getRowKey(row);
            const isSelected = selectedRowKey != null && key === selectedRowKey;
            return (
              <tr
                key={key}
                className={isSelected ? 'table-primary' : undefined}
                style={onRowClick ? { cursor: 'pointer' } : undefined}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
              >
                {columns.map((col) => (
                  <td
                    key={col.id}
                    className={col.cellClassName}
                    style={col.cellStyle}
                  >
                    {col.render
                      ? col.render(row)
                      : col.accessor
                      ? col.accessor(row)
                      : row[col.id]}
                  </td>
                ))}
              </tr>
            );
          })}
          {filteredAndSorted.length === 0 && (
            <tr>
              <td
                colSpan={columns.length}
                className="text-center text-body-secondary py-3"
              >
                Sin registros para los filtros seleccionados.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
