({
    mainConfigFile: "../config/deps.js",
    include: ['requireLib','config/deps'],
    dir: "../release/",
    baseUrl: "../node_modules", //Relative to build directory
    name: "all",
    create: true,
    optimize: "uglify", //"none",
    optimizeCss: "none",
    locale: "en",
    extraLocale: ["sv"],
    skipDirOptimize: true,
    normalizeDirDefines: "skip",
    skipModuleInsertion: true,
    removeCombined: true,
    fileExclusionRegExp: /^(\.|node_modules|release)/,
    onBuildRead: function (moduleName, path, contents) { //Fixes so dojo modules works with require.js
        switch (moduleName) {
            case "dojo/hccss":
                return contents.replace("require.toUrl(\"./resources/blank.gif\")", "'libs/dojo/resources/blank.gif'");
            case "dojo/i18n":
                return contents.replace("./has!host-browser?", "");
            case "dojo/date/locale":
                return contents.replace(/module\.id/g, "\"dojo/date/locale\"");
            case "dojo/on":
                //Inluding aspect always... maybe unneccessary.
                return contents.replace("./has!dom-addeventlistener?:", "");
            case "dojo/ready":
                return contents.replace("./has!host-browser?", "");
            case "dojo/Deferred":
                return contents.replace(/,\s*"\.\/has!.*instrumentation"/, "");
            case "dojo/request/watch":
                return contents.replace("../has!host-browser?../_base/window:", "../_base/window")
                    .replace(/,\s*'\.\.\/has.*'/, ""); //Never including on, problematic?
            case "dojo/request/default":
                return contents.replace("exports.getPlatformDefaultId", "platformId=\"./xhr\";defId=\"./xhr\";exports.getPlatformDefaultId");
            case "dojo/request/handlers":
                return contents.replace("../has!dom?", "");
            case "dijit/_Widget":
                return contents.replace("dojo/query", "jquery")
                    .replace("query('[widgetId]', this.containerNode).map(registry.byNode)",
                    "query('[widgetId').map(function(idx, item) {return registry.byNode(item);})");
            case "dijit/_WidgetBase":
                return contents.replace("dojo/has!dojo-bidi?", "")
                    .replace("require.toUrl(\"dojo/resources/blank.gif\")","''");
            case "dojo/selector/acme":
                return contents.replace("win.doc", "win.doc || {firstChild: {}, compatMode: 'CSS1Compat'}");
            case "dojo/query":
                return contents
                    .replace("\"./selector/_loader\", \"./selector/_loader!default\"", "\"dojo/selector/acme\"")
                    .replace("loader, defaultEngine){", "defaultEngine){var loader;")
                    .replace("dojo._filterQueryResult", "query.load = function(id, parentRequire, loaded){" +
                    "loaded(queryForEngine(defaultEngine, NodeList));" +
                    "};" +
                    "dojo._filterQueryResult");
            default:
                return contents;
        }
    }
});