'use client'

export default function Table({ columns = [], data = [] }) {
  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500">
        No data available
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-slate-200">
            {columns.map((c) => (
              <th
                key={c.accessor}
                className="px-4 py-3.5 font-semibold text-slate-700 uppercase text-xs tracking-wider bg-slate-50/50"
              >
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {data.map((row, i) => (
            <tr
              key={i}
              className="hover:bg-slate-50/80 transition-colors duration-150"
            >
              {columns.map((c) => (
                <td
                  key={c.accessor}
                  className="px-4 py-3.5 text-slate-800"
                >
                  {row[c.accessor]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

