import { SchoolIcon } from "@/components/school-icon";

export function PencilCase({ items }: { items: { id: string; name: string }[] }) {
  return (
    <div className="pencil-case rise-in" aria-label="Cartuchera">
      <p className="pencil-title">Cartuchera</p>
      <div className="pencil-shell">
      <div className="pencil-lid">
        <span className="pencil-zip" />
      </div>
      <div className="pencil-body">
        <div className="pencil-pocket">
          {items.length === 0 ? (
            <p className="pencil-empty">Vacío</p>
          ) : (
            items.map((item) => (
              <div key={item.id} className="pencil-item" title={item.name}>
                <SchoolIcon id={item.id} size={42} />
              </div>
            ))
          )}
        </div>
      </div>
      </div>
    </div>
  );
}
