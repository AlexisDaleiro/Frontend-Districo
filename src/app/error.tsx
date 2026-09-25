"use client";
export default function ErrorPage({
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div className="container section">
      <h1>No pudimos cargar esta página</h1>
      <p>Intentá nuevamente. Tus pedidos confirmados no se modificaron.</p>
      <button className="button" onClick={reset}>
        Volver a intentar
      </button>
    </div>
  );
}
