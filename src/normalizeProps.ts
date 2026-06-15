import { createNormalizer, type NormalizeProps, type PropTypes } from "@zag-js/types";
import { isNumber, isObject, isString } from "@zag-js/utils";

export const normalizeProps = createNormalizer<Props>((props: Dict) => {
    const propsNormalized = {} as NormalizeProps<Props>;

    for (const key in props) {
        const value = props[key];

        if (key === "readOnly" && value === false) continue;

        if (key === "style" && isObject(value)) {
            propsNormalized["style"] = cssify(value) as any;
            continue;
        }

        if (key === "children") {
            if (isString(value)) propsNormalized["textContent" as keyof typeof propsNormalized] = value as any;
            continue;
        }

        propsNormalized[toRippleProp(key) as keyof typeof propsNormalized] = value;
    }

    return propsNormalized;
});

export type Props = JSX.IntrinsicElements & {
    element: JSX.IntrinsicElements[keyof JSX.IntrinsicElements];
    style: JSX.IntrinsicElements[keyof JSX.IntrinsicElements]["style"];
};

const mapProps = {
    onFocus: "onFocusIn",
    onBlur: "onFocusOut",

    onDoubleClick: "onDblClick",

    onChange: "onInput",

    className: "class",

    defaultValue: "value",
    defaultChecked: "checked",

    htmlFor: "for"
} as const;

function toRippleProp(prop: string): string {
    return prop in mapProps ? mapProps[prop as keyof typeof mapProps] : prop;
}

function cssify(style: Dict): StyleObject {
    const css = {} as StyleObject;

    for (const prop in style) {
        const value = style[prop];
        if (!isString(value) && !isNumber(value)) continue;

        (css as Record<string, string | number>)[formatProp(prop)] = value;
    }

    return css;
}

function formatProp(prop: string): string {
    return prop.startsWith("--") ? prop : hyphenate(prop);
}

const patternHasUppercase = /[A-Z]/g;
const patternHasMSPrefix = /^ms/;

const cacheHyphenated: Dict = {};
function hyphenate(name: string): string {
    if (cacheHyphenated.hasOwnProperty(name)) return cacheHyphenated[name];

    const hName = name.replace(patternHasUppercase, lowerAndPrefixHyphen);
    return cacheHyphenated[name] = patternHasMSPrefix.test(hName) ? "-" + hName : hName;
}

function lowerAndPrefixHyphen(str: string): string {
    return "-" + str.toLowerCase();
}

type Dict = PropTypes[keyof PropTypes];
type StyleObject = ReturnType<NormalizeProps<Props>["style"]>;
