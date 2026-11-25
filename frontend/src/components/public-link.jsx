import { getPublicHref } from "../lib/public-routes";

// Enlace interno real (<a href>) para páginas públicas: los buscadores y bots
// de IA pueden seguirlo en el HTML prerenderizado, y para las personas navega
// sin recargar (salvo Cmd/Ctrl/Shift/clic central, que abren pestaña nueva).
export function PublicLink({ to, language, onNavigate, onClick, children, ...rest }) {
    const href = getPublicHref(to, language);

    const handleClick = (event) => {
        onClick?.(event);
        if (event.defaultPrevented) return;
        if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        onNavigate?.(href);
    };

    return (
        <a href={href} onClick={handleClick} {...rest}>
            {children}
        </a>
    );
}
