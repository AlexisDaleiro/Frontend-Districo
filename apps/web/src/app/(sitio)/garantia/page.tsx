import Link from "next/link";
import { ArrowUpRight, ChevronDown } from "lucide-react";

const range = "400 g a 20 kg";
const brands = ["Biofresh", "Gran Plus", "Guabi Natural", "Three Cats", "Three Dogs"];
const steps = [
  ["Guardá el envase", "Con al menos el 80 % del contenido, cerrado de fábrica y sin vencer."],
  ["Volvé al comercio", "Dentro de los 5 días corridos de la compra, con el ticket original."],
  ["Elegí el reemplazo", "El comercio lo coordina con DISTRICO en hasta 5 días hábiles."],
] as const;
const whatsapp = `https://wa.me/59895673109?text=${encodeURIComponent("Hola, quiero hacer un reclamo por la garantía de palatabilidad.")}`;

export const metadata = {
  title: "Garantía de palatabilidad",
  description: `Si tu mascota no acepta el alimento, lo cambiamos. Cubre las presentaciones de ${range} de ${brands.join(", ")}.`,
};

export default function Page() {
  return (
    <>
      <section className="site-catalog-intro site-warranty-intro">
        <div className="container site-warranty-hero">
          <div className="site-warranty-seal"><strong>100%</strong><span>Satisfacción</span></div>
          <div>
            <p className="eyebrow">Garantía de palatabilidad</p>
            <h1>Si tu mascota no lo acepta, lo cambiamos.</h1>
            <p>Vale para las presentaciones de {range} de las marcas que distribuimos: si tu perro o tu gato lo rechaza, te lo cambiamos por otro producto DISTRICO.</p>
          </div>
        </div>
      </section>

      <section className="site-warranty-brands">
        <div className="container">
          <h2 className="reference-kicker">Marcas incluidas</h2>
          <ul>
            {brands.map((brand) => (
              <li key={brand}><Link href={`/productos?search=${encodeURIComponent(brand)}`}>{brand}</Link></li>
            ))}
          </ul>
        </div>
      </section>

      <section className="site-section site-warranty-steps" aria-labelledby="warranty-steps-title">
        <div className="container">
          <h2 id="warranty-steps-title">Cómo se hace el cambio</h2>
          <ol>
            {steps.map(([title, text], index) => (
              <li key={title}>
                <span aria-hidden="true">{index + 1}</span>
                <h3>{title}</h3>
                <p>{text}</p>
              </li>
            ))}
          </ol>

          <details className="site-warranty-terms">
            <summary>
              <span>Alcance y condiciones completas</span>
              <ChevronDown size={20} aria-hidden="true" />
            </summary>
            <h3>Alcance</h3>
            <p>La garantía aplica a los productos de las marcas detalladas, en paquetería de {range}, y puede solicitarse cuando la mascota no acepta el alimento. Consiste en el cambio por otro producto DISTRICO de igual o menor valor comercial; no se devuelve el importe abonado. Si el cambio es por un producto de menor valor, la diferencia queda a favor del cliente para otra compra; si es por uno de mayor valor, se abona la diferencia.</p>
            <h3>Condiciones</h3>
            <ul>
              <li>El producto debe estar dentro de su fecha de vencimiento.</li>
              <li>Debe conservar al menos el 80 % de su contenido original, en su envase original cerrado de fábrica y sin traspasar a otro recipiente.</li>
              <li>El reclamo debe hacerse dentro de los 5 días corridos posteriores a la compra.</li>
              <li>Debe presentarse el ticket o comprobante original de compra con la fecha visible.</li>
            </ul>
            <h3>Procedimiento</h3>
            <p>El cliente concurre personalmente al punto de venta donde realizó la compra, en sus días y horarios de atención habitual, y presenta el producto y el ticket original junto con el formulario completo.</p>
            <p>El formulario solicita:</p>
            <ul>
              <li>Nombre y apellido.</li>
              <li>Celular.</li>
              <li>Establecimiento donde se realizó la compra.</li>
              <li>Fecha de compra.</li>
              <li>Producto a devolver: nombre, presentación en kilogramos, lote y fecha de vencimiento.</li>
              <li>Nombre de la mascota.</li>
            </ul>
            <p>El comercio gestiona el reemplazo en coordinación con DISTRICO dentro de los 5 días hábiles posteriores a la solicitud.</p>
          </details>
        </div>
      </section>

      <section className="reference-contact reference-contact-centered">
        <div className="container reference-contact-grid">
          <div>
            <p className="reference-kicker">Reclamos</p>
            <h2>¿Tu mascota no lo aceptó?</h2>
            <p>También podés hacerlo en persona: llevá el producto y el ticket al comercio donde lo compraste y completás el formulario ahí mismo.</p>
          </div>
          <div className="reference-contact-actions">
            <a className="reference-contact-primary" href={whatsapp} target="_blank" rel="noopener noreferrer">Consultar por la garantía <ArrowUpRight size={18} aria-hidden="true" /></a>
          </div>
        </div>
      </section>
    </>
  );
}
