import { type ControlContext, renderSectionContent } from "../../controls/resolver";
import { usePathIndex, useStudioConfig } from "../../store/hooks";

export function DesignView() {
    const config = useStudioConfig();
    const pathIndex = usePathIndex();

    if (!config) {
        return (
            <p>
                Add a <code>studio.panel</code> section to your sugarcube config to get started.
            </p>
        );
    }

    const ctx: ControlContext = {
        colorScale: config.colorScale,
        pathIndex,
    };

    const sections = config.panel ?? [];

    return (
        <div>
            {sections.map((section, i) => {
                const slug = section.title.toLowerCase().replace(/\s+/g, "-");
                const headingId = `design-section-${slug}-${i}`;
                return (
                    <section key={headingId} aria-labelledby={headingId}>
                        <details open>
                            <summary>
                                <h2 id={headingId}>{section.title}</h2>
                            </summary>
                            <div className="section-content">
                                {renderSectionContent(section, ctx)}
                            </div>
                        </details>
                    </section>
                );
            })}
        </div>
    );
}
