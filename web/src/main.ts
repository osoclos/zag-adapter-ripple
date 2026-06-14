import { mount } from "ripple";

import { App } from "./App.tsrx";
import "./style.css";

const dispose = mount(App, { target: document.body });

if ("hot" in import.meta && typeof import.meta.hot === "object") {
    import.meta.hot.accept();
    import.meta.hot.dispose(dispose);
}
