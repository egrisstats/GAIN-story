/* @ds-bundle: {"format":4,"namespace":"EGRISSDesignSystem_041258","components":[{"name":"Badge","sourcePath":"components/core/Badge.jsx"},{"name":"Button","sourcePath":"components/core/Button.jsx"},{"name":"Callout","sourcePath":"components/core/Callout.jsx"},{"name":"Card","sourcePath":"components/core/Card.jsx"},{"name":"Stat","sourcePath":"components/core/Stat.jsx"},{"name":"Tag","sourcePath":"components/core/Tag.jsx"},{"name":"Checkbox","sourcePath":"components/forms/Checkbox.jsx"},{"name":"Input","sourcePath":"components/forms/Input.jsx"},{"name":"Select","sourcePath":"components/forms/Select.jsx"},{"name":"Tabs","sourcePath":"components/navigation/Tabs.jsx"}],"sourceHashes":{"components/core/Badge.jsx":"ea7a08dae936","components/core/Button.jsx":"f7e72874e677","components/core/Callout.jsx":"2a679cb5ffd6","components/core/Card.jsx":"04d0744706d1","components/core/Stat.jsx":"265e11611260","components/core/Tag.jsx":"5d3a9f91c814","components/forms/Checkbox.jsx":"1ead865dd320","components/forms/Input.jsx":"e2519e18a5d2","components/forms/Select.jsx":"f2c6e0203906","components/navigation/Tabs.jsx":"e8093f86b72b","ui_kits/gain-report/Bands.jsx":"b0dbea438999","ui_kits/gain-report/DataExplorer.jsx":"692af8588841","ui_kits/gain-report/Hero.jsx":"ff94d9b7cb2f","ui_kits/gain-report/TopBar.jsx":"cc70cf6b586d"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.EGRISSDesignSystem_041258 = window.EGRISSDesignSystem_041258 || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/core/Badge.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * EGRISS Badge — status pill with a soft tint and a leading dot.
 */
function Badge({
  status = "info",
  children,
  style,
  ...rest
}) {
  const map = {
    info: {
      bg: "#e4edf8",
      fg: "var(--egriss-deep)",
      dot: "var(--egriss-blue)"
    },
    success: {
      bg: "#dcf1e8",
      fg: "#1c6b51",
      dot: "var(--ok)"
    },
    warning: {
      bg: "#f6ecd6",
      fg: "#7a5a16",
      dot: "var(--warn)"
    },
    error: {
      bg: "#fde3e3",
      fg: "#a23434",
      dot: "var(--error)"
    },
    neutral: {
      bg: "var(--egriss-tint)",
      fg: "var(--egriss-muted)",
      dot: "var(--egriss-muted)"
    }
  };
  const s = map[status] || map.info;
  return /*#__PURE__*/React.createElement("span", _extends({
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: "6px",
      fontFamily: "var(--font-body)",
      fontWeight: "var(--fw-semibold)",
      fontSize: "var(--text-xs)",
      lineHeight: 1,
      padding: "5px 11px 5px 9px",
      borderRadius: "var(--radius-pill)",
      background: s.bg,
      color: s.fg,
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("span", {
    style: {
      width: 7,
      height: 7,
      borderRadius: "50%",
      background: s.dot,
      flex: "none"
    }
  }), children);
}
Object.assign(__ds_scope, { Badge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Badge.jsx", error: String((e && e.message) || e) }); }

// components/core/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * EGRISS Button — institutional, crisp, restrained rounding.
 * Variants map to the brand palette; teal is the signature call-to-action.
 */
function Button({
  variant = "primary",
  size = "md",
  disabled = false,
  type = "button",
  iconLeft = null,
  iconRight = null,
  onClick,
  children,
  style,
  ...rest
}) {
  const sizes = {
    sm: {
      fontSize: "var(--text-sm)",
      padding: "8px 14px",
      gap: "6px"
    },
    md: {
      fontSize: "var(--text-base)",
      padding: "11px 20px",
      gap: "8px"
    },
    lg: {
      fontSize: "var(--text-md)",
      padding: "14px 26px",
      gap: "10px"
    }
  };
  const variants = {
    primary: {
      background: "var(--egriss-navy)",
      color: "var(--egriss-white)",
      border: "1px solid var(--egriss-navy)"
    },
    secondary: {
      background: "var(--egriss-white)",
      color: "var(--egriss-navy)",
      border: "1px solid var(--border-strong)"
    },
    teal: {
      background: "var(--egriss-teal)",
      color: "var(--egriss-navy)",
      border: "1px solid var(--egriss-teal)"
    },
    ghost: {
      background: "transparent",
      color: "var(--egriss-blue)",
      border: "1px solid transparent"
    }
  };
  const base = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "var(--font-body)",
    fontWeight: "var(--fw-semibold)",
    lineHeight: 1,
    borderRadius: "var(--radius-sm)",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.45 : 1,
    transition: "filter var(--dur-fast) var(--ease-standard), transform var(--dur-fast) var(--ease-standard)",
    whiteSpace: "nowrap",
    ...sizes[size],
    ...variants[variant],
    ...style
  };
  const hoverIn = e => {
    if (disabled) return;
    e.currentTarget.style.filter = variant === "secondary" || variant === "ghost" ? "brightness(0.98)" : "brightness(1.08)";
    if (variant === "secondary") e.currentTarget.style.borderColor = "var(--egriss-blue)";
  };
  const hoverOut = e => {
    e.currentTarget.style.filter = "none";
    if (variant === "secondary") e.currentTarget.style.borderColor = "var(--border-strong)";
  };
  const pressIn = e => {
    if (!disabled) e.currentTarget.style.transform = "translateY(1px)";
  };
  const pressOut = e => {
    e.currentTarget.style.transform = "none";
  };
  return /*#__PURE__*/React.createElement("button", _extends({
    type: type,
    disabled: disabled,
    onClick: onClick,
    style: base,
    onMouseEnter: hoverIn,
    onMouseLeave: hoverOut,
    onMouseDown: pressIn,
    onMouseUp: pressOut
  }, rest), iconLeft, children, iconRight);
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Button.jsx", error: String((e && e.message) || e) }); }

// components/core/Callout.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * EGRISS Callout — a note flagged with the brand's teal accent rule on
 * the leading edge. For source notes, key takeaways, definitions.
 */
function Callout({
  tone = "teal",
  title,
  children,
  style,
  ...rest
}) {
  const edges = {
    teal: "var(--egriss-teal)",
    blue: "var(--egriss-blue)",
    coral: "var(--egriss-coral)",
    navy: "var(--egriss-navy)"
  };
  return /*#__PURE__*/React.createElement("div", _extends({
    role: "note",
    style: {
      background: "var(--egriss-tint)",
      borderLeft: `var(--rule-accent) solid ${edges[tone] || edges.teal}`,
      borderRadius: "0 var(--radius-sm) var(--radius-sm) 0",
      padding: "var(--space-4) var(--space-5)",
      ...style
    }
  }, rest), title && /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-head)",
      fontWeight: "var(--fw-bold)",
      fontSize: "var(--text-base)",
      color: "var(--text-strong)",
      marginBottom: "var(--space-2)"
    }
  }, title), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-body)",
      fontSize: "var(--text-sm)",
      lineHeight: "var(--lh-body)",
      color: "var(--text-body)"
    }
  }, children));
}
Object.assign(__ds_scope, { Callout });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Callout.jsx", error: String((e && e.message) || e) }); }

// components/core/Card.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * EGRISS Card — the workhorse surface. Optional eyebrow + teal accent
 * rule echo the brand's section headers.
 */
function Card({
  eyebrow,
  title,
  rule = false,
  tone = "light",
  padding = "var(--space-5)",
  children,
  style,
  ...rest
}) {
  const tones = {
    light: {
      background: "var(--color-surface)",
      color: "var(--text-body)",
      border: "1px solid var(--border)"
    },
    sunk: {
      background: "var(--egriss-tint)",
      color: "var(--text-body)",
      border: "1px solid transparent"
    },
    navy: {
      background: "var(--egriss-navy)",
      color: "var(--text-on-dark)",
      border: "1px solid transparent"
    }
  };
  const t = tones[tone] || tones.light;
  const onDark = tone === "navy";
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      borderRadius: "var(--radius-md)",
      boxShadow: tone === "light" ? "var(--shadow-sm)" : "none",
      padding,
      ...t,
      ...style
    }
  }, rest), eyebrow && /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-head)",
      fontWeight: "var(--fw-bold)",
      fontSize: "var(--text-sm)",
      letterSpacing: "var(--ls-caps)",
      textTransform: "uppercase",
      color: onDark ? "var(--egriss-teal)" : "var(--accent-strong)",
      marginBottom: "var(--space-2)"
    }
  }, eyebrow), title && /*#__PURE__*/React.createElement("h3", {
    style: {
      fontFamily: "var(--font-head)",
      fontWeight: "var(--fw-bold)",
      fontSize: "var(--text-xl)",
      lineHeight: "var(--lh-snug)",
      letterSpacing: "var(--ls-tight)",
      color: onDark ? "var(--text-on-dark)" : "var(--text-strong)",
      margin: 0
    }
  }, title), rule && /*#__PURE__*/React.createElement("hr", {
    style: {
      height: "var(--rule-accent)",
      width: 72,
      border: 0,
      borderRadius: "var(--radius-pill)",
      margin: "var(--space-3) 0 0",
      background: "linear-gradient(90deg, var(--accent), rgba(76,195,201,0))"
    }
  }), children && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: title || eyebrow || rule ? "var(--space-4)" : 0
    }
  }, children));
}
Object.assign(__ds_scope, { Card });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Card.jsx", error: String((e && e.message) || e) }); }

// components/core/Stat.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * EGRISS Stat — the brand's signature key figure: a large mono numeral
 * with a small caption, the way GAIN charts surface headline numbers.
 */
function Stat({
  value,
  label,
  accent = "navy",
  align = "left",
  style,
  ...rest
}) {
  const accents = {
    navy: "var(--text-strong)",
    teal: "var(--egriss-teal)",
    blue: "var(--egriss-blue)",
    coral: "var(--egriss-coral)"
  };
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      textAlign: align,
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-mono)",
      fontWeight: "var(--fw-semibold)",
      fontSize: "var(--text-4xl)",
      lineHeight: 1,
      letterSpacing: "var(--ls-tight)",
      color: accents[accent] || accents.navy
    }
  }, value), label && /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-body)",
      fontSize: "var(--text-sm)",
      color: "var(--text-muted)",
      marginTop: "var(--space-2)",
      maxWidth: "22ch",
      ...(align === "center" ? {
        marginLeft: "auto",
        marginRight: "auto"
      } : null)
    }
  }, label));
}
Object.assign(__ds_scope, { Stat });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Stat.jsx", error: String((e && e.message) || e) }); }

// components/core/Tag.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * EGRISS Tag — the small categorical label used in chart legends and
 * metadata rows. A leading swatch dot is optional.
 */
function Tag({
  tone = "neutral",
  dot = false,
  children,
  style,
  ...rest
}) {
  const tones = {
    neutral: {
      bg: "var(--egriss-tint)",
      fg: "var(--egriss-navy)",
      dot: "var(--egriss-muted)"
    },
    blue: {
      bg: "#e4edf8",
      fg: "var(--egriss-deep)",
      dot: "var(--egriss-blue)"
    },
    teal: {
      bg: "#dbf4f5",
      fg: "#0c5b5f",
      dot: "var(--egriss-teal)"
    },
    coral: {
      bg: "#fde3e3",
      fg: "#a23434",
      dot: "var(--egriss-coral)"
    },
    gold: {
      bg: "#f6ecd6",
      fg: "#7a5a16",
      dot: "var(--gain-gold)"
    }
  };
  const t = tones[tone] || tones.neutral;
  return /*#__PURE__*/React.createElement("span", _extends({
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: "6px",
      fontFamily: "var(--font-body)",
      fontWeight: "var(--fw-medium)",
      fontSize: "var(--text-xs)",
      lineHeight: 1,
      padding: "5px 10px",
      borderRadius: "var(--radius-sm)",
      background: t.bg,
      color: t.fg,
      ...style
    }
  }, rest), dot && /*#__PURE__*/React.createElement("span", {
    style: {
      width: 8,
      height: 8,
      borderRadius: 2,
      background: t.dot,
      flex: "none"
    }
  }), children);
}
Object.assign(__ds_scope, { Tag });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Tag.jsx", error: String((e && e.message) || e) }); }

// components/forms/Checkbox.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * EGRISS Checkbox — square check with a teal-filled checked state.
 */
function Checkbox({
  label,
  checked = false,
  onChange,
  disabled = false,
  id,
  style,
  ...rest
}) {
  const cbId = id || (label ? `cb-${String(label).replace(/\s+/g, "-").toLowerCase()}` : undefined);
  return /*#__PURE__*/React.createElement("label", {
    htmlFor: cbId,
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: "10px",
      cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? 0.5 : 1,
      fontFamily: "var(--font-body)",
      fontSize: "var(--text-base)",
      color: "var(--text-body)",
      ...style
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      position: "relative",
      width: 18,
      height: 18,
      flex: "none",
      borderRadius: "var(--radius-xs)",
      border: `2px solid ${checked ? "var(--egriss-teal)" : "var(--border-strong)"}`,
      background: checked ? "var(--egriss-teal)" : "var(--color-surface)",
      transition: "background var(--dur-fast), border-color var(--dur-fast)"
    }
  }, checked && /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 16 16",
    width: "14",
    height: "14",
    style: {
      position: "absolute",
      top: 0,
      left: 0
    }
  }, /*#__PURE__*/React.createElement("path", {
    d: "M3.5 8.5l3 3 6-7",
    fill: "none",
    stroke: "var(--egriss-navy)",
    strokeWidth: "2.2",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }))), /*#__PURE__*/React.createElement("input", _extends({
    id: cbId,
    type: "checkbox",
    checked: checked,
    onChange: onChange,
    disabled: disabled,
    style: {
      position: "absolute",
      opacity: 0,
      width: 0,
      height: 0
    }
  }, rest)), label);
}
Object.assign(__ds_scope, { Checkbox });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Checkbox.jsx", error: String((e && e.message) || e) }); }

// components/forms/Input.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * EGRISS Input — labelled text field with a hairline border that
 * deepens to blue on focus.
 */
function Input({
  label,
  hint,
  error,
  type = "text",
  id,
  value,
  onChange,
  placeholder,
  disabled = false,
  style,
  ...rest
}) {
  const inputId = id || (label ? `in-${label.replace(/\s+/g, "-").toLowerCase()}` : undefined);
  const [focus, setFocus] = React.useState(false);
  const borderColor = error ? "var(--error)" : focus ? "var(--egriss-blue)" : "var(--border-strong)";
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: "6px",
      ...style
    }
  }, label && /*#__PURE__*/React.createElement("label", {
    htmlFor: inputId,
    style: {
      fontFamily: "var(--font-body)",
      fontSize: "var(--text-sm)",
      fontWeight: "var(--fw-semibold)",
      color: "var(--text-strong)"
    }
  }, label), /*#__PURE__*/React.createElement("input", _extends({
    id: inputId,
    type: type,
    value: value,
    onChange: onChange,
    placeholder: placeholder,
    disabled: disabled,
    onFocus: () => setFocus(true),
    onBlur: () => setFocus(false),
    style: {
      fontFamily: "var(--font-body)",
      fontSize: "var(--text-base)",
      color: "var(--text-body)",
      background: disabled ? "var(--egriss-tint)" : "var(--color-surface)",
      border: `1px solid ${borderColor}`,
      borderRadius: "var(--radius-sm)",
      padding: "10px 12px",
      outline: "none",
      boxShadow: focus ? "var(--shadow-focus)" : "none",
      transition: "border-color var(--dur-fast), box-shadow var(--dur-fast)"
    }
  }, rest)), (hint || error) && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "var(--text-xs)",
      color: error ? "var(--error)" : "var(--text-muted)"
    }
  }, error || hint));
}
Object.assign(__ds_scope, { Input });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Input.jsx", error: String((e && e.message) || e) }); }

// components/forms/Select.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * EGRISS Select — native select with the brand's field styling and a
 * custom chevron.
 */
function Select({
  label,
  id,
  value,
  onChange,
  options = [],
  disabled = false,
  style,
  ...rest
}) {
  const selId = id || (label ? `sel-${label.replace(/\s+/g, "-").toLowerCase()}` : undefined);
  const [focus, setFocus] = React.useState(false);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: "6px",
      ...style
    }
  }, label && /*#__PURE__*/React.createElement("label", {
    htmlFor: selId,
    style: {
      fontFamily: "var(--font-body)",
      fontSize: "var(--text-sm)",
      fontWeight: "var(--fw-semibold)",
      color: "var(--text-strong)"
    }
  }, label), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative"
    }
  }, /*#__PURE__*/React.createElement("select", _extends({
    id: selId,
    value: value,
    onChange: onChange,
    disabled: disabled,
    onFocus: () => setFocus(true),
    onBlur: () => setFocus(false),
    style: {
      appearance: "none",
      width: "100%",
      fontFamily: "var(--font-body)",
      fontSize: "var(--text-base)",
      color: "var(--text-body)",
      background: disabled ? "var(--egriss-tint)" : "var(--color-surface)",
      border: `1px solid ${focus ? "var(--egriss-blue)" : "var(--border-strong)"}`,
      borderRadius: "var(--radius-sm)",
      padding: "10px 36px 10px 12px",
      outline: "none",
      boxShadow: focus ? "var(--shadow-focus)" : "none",
      cursor: disabled ? "not-allowed" : "pointer"
    }
  }, rest), options.map(o => {
    const opt = typeof o === "string" ? {
      value: o,
      label: o
    } : o;
    return /*#__PURE__*/React.createElement("option", {
      key: opt.value,
      value: opt.value
    }, opt.label);
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      position: "absolute",
      right: 12,
      top: "50%",
      transform: "translateY(-50%)",
      pointerEvents: "none",
      color: "var(--text-muted)",
      fontSize: 12
    }
  }, "\u25BE")));
}
Object.assign(__ds_scope, { Select });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Select.jsx", error: String((e && e.message) || e) }); }

// components/navigation/Tabs.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * EGRISS Tabs — underline tabs with a teal active indicator.
 * Controlled via `value` / `onChange`, or uncontrolled with `defaultValue`.
 */
function Tabs({
  tabs = [],
  value,
  defaultValue,
  onChange,
  style,
  ...rest
}) {
  const [internal, setInternal] = React.useState(defaultValue ?? (tabs[0] && tabs[0].value));
  const active = value !== undefined ? value : internal;
  const select = v => {
    if (value === undefined) setInternal(v);
    onChange && onChange(v);
  };
  return /*#__PURE__*/React.createElement("div", _extends({
    role: "tablist",
    style: {
      display: "flex",
      gap: "var(--space-5)",
      borderBottom: "1px solid var(--border)",
      ...style
    }
  }, rest), tabs.map(t => {
    const on = t.value === active;
    return /*#__PURE__*/React.createElement("button", {
      key: t.value,
      role: "tab",
      "aria-selected": on,
      onClick: () => select(t.value),
      style: {
        appearance: "none",
        background: "none",
        border: "none",
        cursor: "pointer",
        fontFamily: "var(--font-body)",
        fontSize: "var(--text-base)",
        fontWeight: on ? "var(--fw-semibold)" : "var(--fw-medium)",
        color: on ? "var(--text-strong)" : "var(--text-muted)",
        padding: "0 0 12px",
        marginBottom: "-1px",
        borderBottom: `var(--border-width-strong) solid ${on ? "var(--egriss-teal)" : "transparent"}`,
        transition: "color var(--dur-fast), border-color var(--dur-fast)"
      }
    }, t.label);
  }));
}
Object.assign(__ds_scope, { Tabs });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/Tabs.jsx", error: String((e && e.message) || e) }); }

// ui_kits/gain-report/Bands.jsx
try { (() => {
// EGRISS GAIN report — testimony band (deep-blue ground, coral quote mark) + footer
function QuoteBand() {
  return /*#__PURE__*/React.createElement("section", {
    style: {
      background: "var(--egriss-deep)",
      color: "#fff",
      padding: "var(--space-9) var(--space-7)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: "var(--container-narrow)",
      margin: "0 auto",
      textAlign: "center"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-head)",
      fontSize: 72,
      lineHeight: 0.5,
      color: "var(--egriss-coral)",
      fontWeight: 800
    }
  }, "\u201C"), /*#__PURE__*/React.createElement("blockquote", {
    style: {
      fontFamily: "var(--font-head)",
      fontWeight: 600,
      fontSize: "var(--text-2xl)",
      lineHeight: 1.3,
      letterSpacing: "-0.01em",
      color: "#fff",
      margin: "var(--space-4) 0"
    }
  }, "For the first time, our census counts refugees the same way it counts everyone else. The recommendations gave us a shared method to do it."), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: "var(--text-sm)",
      color: "rgba(255,255,255,0.7)"
    }
  }, "National Statistical Office \xB7 GAIN 2025 country submission")));
}
function ChallengeBand() {
  const {
    Stat
  } = window.EGRISSDesignSystem_041258;
  return /*#__PURE__*/React.createElement("section", {
    style: {
      background: "var(--color-bg)",
      padding: "var(--space-9) var(--space-7)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: "var(--container)",
      margin: "0 auto",
      display: "grid",
      gridTemplateColumns: "1fr 1.2fr",
      gap: "var(--space-8)",
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-head)",
      fontWeight: 700,
      fontSize: "var(--text-sm)",
      letterSpacing: "0.12em",
      textTransform: "uppercase",
      color: "var(--accent-strong)"
    }
  }, "What's getting in the way"), /*#__PURE__*/React.createElement("h2", {
    style: {
      fontFamily: "var(--font-head)",
      fontWeight: 700,
      fontSize: "var(--text-2xl)",
      letterSpacing: "-0.02em",
      color: "var(--text-strong)",
      margin: "8px 0 var(--space-4)"
    }
  }, "Implementation challenges, mapped"), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: "var(--text-md)",
      lineHeight: 1.6,
      color: "var(--text-body)",
      margin: "0 0 var(--space-6)"
    }
  }, "Bubble size shows the total PRO20 challenge items reported. The most common barriers remain capacity, funding and access to administrative data."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: "var(--space-7)"
    }
  }, /*#__PURE__*/React.createElement(Stat, {
    value: "63",
    label: "country-led examples in 2025",
    accent: "navy"
  }), /*#__PURE__*/React.createElement(Stat, {
    value: "40",
    label: "institution-led using recs",
    accent: "teal"
  }))), /*#__PURE__*/React.createElement("figure", {
    style: {
      margin: 0,
      borderRadius: "var(--radius-lg)",
      overflow: "hidden",
      boxShadow: "var(--shadow-md)"
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/charts/LI.4_challenges_bubble.png",
    alt: "Where are implementation challenges reported?",
    style: {
      width: "100%",
      display: "block"
    }
  }))));
}
function Footer() {
  return /*#__PURE__*/React.createElement("footer", {
    style: {
      background: "var(--egriss-navy)",
      color: "rgba(255,255,255,0.72)",
      padding: "var(--space-8) var(--space-7)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: "var(--container)",
      margin: "0 auto",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      flexWrap: "wrap",
      gap: "var(--space-5)"
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/logos/egriss-white-h.png",
    alt: "EGRISS",
    style: {
      height: 52
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: "var(--text-sm)",
      textAlign: "right",
      lineHeight: 1.7
    }
  }, "Source: GAIN 2025 Survey \xB7 EGRISS Secretariat", /*#__PURE__*/React.createElement("br", null), "Expert Group on Refugee, IDP and Statelessness Statistics")));
}
window.QuoteBand = QuoteBand;
window.ChallengeBand = ChallengeBand;
window.Footer = Footer;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/gain-report/Bands.jsx", error: String((e && e.message) || e) }); }

// ui_kits/gain-report/DataExplorer.jsx
try { (() => {
// EGRISS GAIN report — interactive data explorer (tabs switch chart views)
function DataExplorer() {
  const {
    Tabs,
    Tag,
    Callout,
    Select
  } = window.EGRISSDesignSystem_041258;
  const [view, setView] = React.useState("map");
  const [year, setYear] = React.useState("All years");
  const views = {
    map: {
      img: "../../assets/charts/LI.1_global_presence.png",
      title: "Where is EGRISS guidance being put into practice?",
      note: "117 examples tracked across 49 countries · 91 use EGRISS recommendations."
    },
    trend: {
      img: "../../assets/charts/LI.2_growth_facet.png",
      title: "Growth in tracked examples, 2021–2025",
      note: "The evidence base has grown each year as monitoring has matured."
    },
    waffle: {
      img: "../../assets/charts/LI.9_Waffle_RecUse.png",
      title: "Use of recommendations in country-led examples",
      note: "Each square is one example. Teal indicates recommendations in use."
    },
    regional: {
      img: "../../assets/charts/LI.3_regional_breakdown.png",
      title: "Regional breakdown of examples",
      note: "Implementation is concentrated in Africa, the Americas and Asia-Pacific."
    }
  };
  const cur = views[view];
  return /*#__PURE__*/React.createElement("section", {
    style: {
      background: "var(--color-bg)",
      padding: "var(--space-9) var(--space-7)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: "var(--container)",
      margin: "0 auto"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-head)",
      fontWeight: 700,
      fontSize: "var(--text-sm)",
      letterSpacing: "0.12em",
      textTransform: "uppercase",
      color: "var(--accent-strong)"
    }
  }, "Explore the evidence"), /*#__PURE__*/React.createElement("h2", {
    style: {
      fontFamily: "var(--font-head)",
      fontWeight: 700,
      fontSize: "var(--text-2xl)",
      letterSpacing: "-0.02em",
      color: "var(--text-strong)",
      margin: "8px 0 var(--space-5)"
    }
  }, "The GAIN 2025 data, four ways"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "flex-end",
      flexWrap: "wrap",
      gap: "var(--space-4)"
    }
  }, /*#__PURE__*/React.createElement(Tabs, {
    value: view,
    onChange: setView,
    tabs: [{
      value: "map",
      label: "Global map"
    }, {
      value: "trend",
      label: "Trend"
    }, {
      value: "waffle",
      label: "Recommendation use"
    }, {
      value: "regional",
      label: "Regional"
    }]
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      minWidth: 180
    }
  }, /*#__PURE__*/React.createElement(Select, {
    value: year,
    onChange: e => setYear(e.target.value),
    options: ["All years", "2025", "2024", "2023", "2022", "2021"]
  }))), /*#__PURE__*/React.createElement("figure", {
    style: {
      margin: "var(--space-5) 0 0",
      background: "var(--egriss-navy)",
      borderRadius: "var(--radius-lg)",
      overflow: "hidden",
      boxShadow: "var(--shadow-lg)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "var(--space-5) var(--space-6) 0"
    }
  }, /*#__PURE__*/React.createElement("h3", {
    style: {
      fontFamily: "var(--font-head)",
      color: "#fff",
      fontWeight: 600,
      fontSize: "var(--text-xl)",
      margin: 0
    }
  }, cur.title)), /*#__PURE__*/React.createElement("img", {
    src: cur.img,
    alt: cur.title,
    style: {
      width: "100%",
      display: "block"
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: "var(--space-4)"
    }
  }, /*#__PURE__*/React.createElement(Callout, {
    tone: "teal",
    title: "Reading this view"
  }, cur.note)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: "var(--space-3)",
      flexWrap: "wrap",
      marginTop: "var(--space-4)"
    }
  }, /*#__PURE__*/React.createElement(Tag, {
    tone: "teal",
    dot: true
  }, "Using recommendations"), /*#__PURE__*/React.createElement(Tag, {
    tone: "blue",
    dot: true
  }, "Institution-led"), /*#__PURE__*/React.createElement(Tag, {
    tone: "neutral",
    dot: true
  }, "Country-led"), /*#__PURE__*/React.createElement(Tag, {
    tone: "gold",
    dot: true
  }, "No response"))));
}
window.DataExplorer = DataExplorer;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/gain-report/DataExplorer.jsx", error: String((e && e.message) || e) }); }

// ui_kits/gain-report/Hero.jsx
try { (() => {
// EGRISS GAIN report — hero band on navy ground with key-figure stat row
function Hero() {
  const {
    Stat,
    Tag
  } = window.EGRISSDesignSystem_041258;
  return /*#__PURE__*/React.createElement("section", {
    style: {
      background: "var(--egriss-navy)",
      color: "#fff",
      padding: "var(--space-9) var(--space-7) var(--space-8)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: "var(--container)",
      margin: "0 auto"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-head)",
      fontWeight: 700,
      fontSize: "var(--text-sm)",
      letterSpacing: "0.12em",
      textTransform: "uppercase",
      color: "var(--egriss-teal)"
    }
  }, "GAIN 2025 \xB7 Guidance into practice"), /*#__PURE__*/React.createElement("h1", {
    style: {
      fontFamily: "var(--font-head)",
      fontWeight: 800,
      color: "#fff",
      fontSize: "var(--text-4xl)",
      lineHeight: 1.05,
      letterSpacing: "-0.02em",
      margin: "var(--space-4) 0 var(--space-4)",
      maxWidth: "16ch"
    }
  }, "How EGRISS guidance is put into practice"), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: "var(--text-lg)",
      lineHeight: 1.5,
      color: "rgba(255,255,255,0.82)",
      maxWidth: "54ch",
      margin: 0
    }
  }, "Each year the Secretariat tracks where national statistical systems and institutions apply the international recommendations on refugee, IDP and statelessness statistics."), /*#__PURE__*/React.createElement("hr", {
    style: {
      height: 3,
      width: 72,
      border: 0,
      borderRadius: 999,
      margin: "var(--space-6) 0",
      background: "linear-gradient(90deg, var(--egriss-teal), rgba(76,195,201,0))"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: "var(--space-9)",
      flexWrap: "wrap"
    }
  }, /*#__PURE__*/React.createElement(StatInverse, {
    value: "117",
    label: "examples tracked"
  }), /*#__PURE__*/React.createElement(StatInverse, {
    value: "91",
    label: "using recommendations",
    teal: true
  }), /*#__PURE__*/React.createElement(StatInverse, {
    value: "49",
    label: "countries reached"
  }), /*#__PURE__*/React.createElement(StatInverse, {
    value: "5",
    label: "years of monitoring"
  }))));
}
function StatInverse({
  value,
  label,
  teal
}) {
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-mono)",
      fontWeight: 600,
      fontSize: "var(--text-5xl)",
      lineHeight: 1,
      letterSpacing: "-0.02em",
      color: teal ? "var(--egriss-teal)" : "#fff"
    }
  }, value), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: "var(--text-sm)",
      color: "rgba(255,255,255,0.7)",
      marginTop: 8
    }
  }, label));
}
window.Hero = Hero;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/gain-report/Hero.jsx", error: String((e && e.message) || e) }); }

// ui_kits/gain-report/TopBar.jsx
try { (() => {
// EGRISS GAIN report — top navigation bar
function TopBar() {
  const links = ["Overview", "Where", "Recommendations", "Challenges", "Methodology"];
  return /*#__PURE__*/React.createElement("header", {
    style: {
      position: "sticky",
      top: 0,
      zIndex: 50,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "14px var(--space-7)",
      background: "rgba(255,255,255,0.92)",
      backdropFilter: "blur(8px)",
      borderBottom: "1px solid var(--border)"
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/logos/egriss-blue-h-plain.png",
    alt: "EGRISS",
    style: {
      height: 34
    }
  }), /*#__PURE__*/React.createElement("nav", {
    style: {
      display: "flex",
      gap: "var(--space-5)",
      alignItems: "center"
    }
  }, links.map((l, i) => /*#__PURE__*/React.createElement("a", {
    key: l,
    href: "#",
    style: {
      fontSize: "var(--text-sm)",
      fontWeight: "var(--fw-medium)",
      color: i === 0 ? "var(--text-strong)" : "var(--text-muted)",
      textDecoration: "none"
    }
  }, l)), /*#__PURE__*/React.createElement("span", {
    style: {
      width: 1,
      height: 20,
      background: "var(--border)"
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex"
    }
  }, React.createElement(window.EGRISSDesignSystem_041258.Button, {
    variant: "teal",
    size: "sm"
  }, "Download report"))));
}
window.TopBar = TopBar;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/gain-report/TopBar.jsx", error: String((e && e.message) || e) }); }

__ds_ns.Badge = __ds_scope.Badge;

__ds_ns.Button = __ds_scope.Button;

__ds_ns.Callout = __ds_scope.Callout;

__ds_ns.Card = __ds_scope.Card;

__ds_ns.Stat = __ds_scope.Stat;

__ds_ns.Tag = __ds_scope.Tag;

__ds_ns.Checkbox = __ds_scope.Checkbox;

__ds_ns.Input = __ds_scope.Input;

__ds_ns.Select = __ds_scope.Select;

__ds_ns.Tabs = __ds_scope.Tabs;

})();
