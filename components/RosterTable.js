// components/RosterTable.js
export default function RosterTable({ roster }) {
  return (
    <table>
      <thead><tr><th>Role</th><th>Date</th></tr></thead>
      <tbody>
        {roster.map(shift => (
          <tr key={shift.id}>
            <td>{shift.role}</td>
            <td>{shift.date}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
