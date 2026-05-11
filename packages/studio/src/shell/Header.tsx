import { Logo } from "./Logo";

export function Header() {
    return (
        <header className="header">
            <a href="/" aria-label="Sugarcube">
                <Logo />
            </a>
        </header>
    );
}
