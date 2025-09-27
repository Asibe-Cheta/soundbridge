"use strict";
/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
exports.id = "vendor-chunks/isows";
exports.ids = ["vendor-chunks/isows"];
exports.modules = {

/***/ "(rsc)/../../node_modules/isows/_esm/index.js":
/*!**********************************************!*\
  !*** ../../node_modules/isows/_esm/index.js ***!
  \**********************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   WebSocket: () => (/* binding */ WebSocket)\n/* harmony export */ });\n/* harmony import */ var ws__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ws */ \"(rsc)/../../node_modules/ws/wrapper.mjs\");\n/* harmony import */ var _utils_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./utils.js */ \"(rsc)/../../node_modules/isows/_esm/utils.js\");\n\n\nconst WebSocket = (() => {\n    try {\n        return (0,_utils_js__WEBPACK_IMPORTED_MODULE_1__.getNativeWebSocket)();\n    }\n    catch {\n        if (ws__WEBPACK_IMPORTED_MODULE_0__.WebSocket)\n            return ws__WEBPACK_IMPORTED_MODULE_0__.WebSocket;\n        return ws__WEBPACK_IMPORTED_MODULE_0__;\n    }\n})();\n//# sourceMappingURL=index.js.map//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi4vLi4vbm9kZV9tb2R1bGVzL2lzb3dzL19lc20vaW5kZXguanMiLCJtYXBwaW5ncyI6Ijs7Ozs7O0FBQWlDO0FBQ2U7QUFDekM7QUFDUDtBQUNBLGVBQWUsNkRBQWtCO0FBQ2pDO0FBQ0E7QUFDQSxZQUFZLHlDQUFvQjtBQUNoQyxtQkFBbUIseUNBQW9CO0FBQ3ZDLGVBQWUsK0JBQVU7QUFDekI7QUFDQSxDQUFDO0FBQ0QiLCJzb3VyY2VzIjpbIkM6XFxVc2Vyc1xcaXZvbmVcXE9uZURyaXZlXFxEb2N1bWVudHNcXHNvdW5kYnJpZGdlXFxub2RlX21vZHVsZXNcXGlzb3dzXFxfZXNtXFxpbmRleC5qcyJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBXZWJTb2NrZXRfIGZyb20gXCJ3c1wiO1xuaW1wb3J0IHsgZ2V0TmF0aXZlV2ViU29ja2V0IH0gZnJvbSBcIi4vdXRpbHMuanNcIjtcbmV4cG9ydCBjb25zdCBXZWJTb2NrZXQgPSAoKCkgPT4ge1xuICAgIHRyeSB7XG4gICAgICAgIHJldHVybiBnZXROYXRpdmVXZWJTb2NrZXQoKTtcbiAgICB9XG4gICAgY2F0Y2gge1xuICAgICAgICBpZiAoV2ViU29ja2V0Xy5XZWJTb2NrZXQpXG4gICAgICAgICAgICByZXR1cm4gV2ViU29ja2V0Xy5XZWJTb2NrZXQ7XG4gICAgICAgIHJldHVybiBXZWJTb2NrZXRfO1xuICAgIH1cbn0pKCk7XG4vLyMgc291cmNlTWFwcGluZ1VSTD1pbmRleC5qcy5tYXAiXSwibmFtZXMiOltdLCJpZ25vcmVMaXN0IjpbMF0sInNvdXJjZVJvb3QiOiIifQ==\n//# sourceURL=webpack-internal:///(rsc)/../../node_modules/isows/_esm/index.js\n");

/***/ }),

/***/ "(rsc)/../../node_modules/isows/_esm/utils.js":
/*!**********************************************!*\
  !*** ../../node_modules/isows/_esm/utils.js ***!
  \**********************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   getNativeWebSocket: () => (/* binding */ getNativeWebSocket)\n/* harmony export */ });\nfunction getNativeWebSocket() {\n    if (typeof WebSocket !== \"undefined\")\n        return WebSocket;\n    if (typeof global.WebSocket !== \"undefined\")\n        return global.WebSocket;\n    if (typeof window.WebSocket !== \"undefined\")\n        return window.WebSocket;\n    if (typeof self.WebSocket !== \"undefined\")\n        return self.WebSocket;\n    throw new Error(\"`WebSocket` is not supported in this environment\");\n}\n//# sourceMappingURL=utils.js.map//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi4vLi4vbm9kZV9tb2R1bGVzL2lzb3dzL19lc20vdXRpbHMuanMiLCJtYXBwaW5ncyI6Ijs7OztBQUFPO0FBQ1A7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsInNvdXJjZXMiOlsiQzpcXFVzZXJzXFxpdm9uZVxcT25lRHJpdmVcXERvY3VtZW50c1xcc291bmRicmlkZ2VcXG5vZGVfbW9kdWxlc1xcaXNvd3NcXF9lc21cXHV0aWxzLmpzIl0sInNvdXJjZXNDb250ZW50IjpbImV4cG9ydCBmdW5jdGlvbiBnZXROYXRpdmVXZWJTb2NrZXQoKSB7XG4gICAgaWYgKHR5cGVvZiBXZWJTb2NrZXQgIT09IFwidW5kZWZpbmVkXCIpXG4gICAgICAgIHJldHVybiBXZWJTb2NrZXQ7XG4gICAgaWYgKHR5cGVvZiBnbG9iYWwuV2ViU29ja2V0ICE9PSBcInVuZGVmaW5lZFwiKVxuICAgICAgICByZXR1cm4gZ2xvYmFsLldlYlNvY2tldDtcbiAgICBpZiAodHlwZW9mIHdpbmRvdy5XZWJTb2NrZXQgIT09IFwidW5kZWZpbmVkXCIpXG4gICAgICAgIHJldHVybiB3aW5kb3cuV2ViU29ja2V0O1xuICAgIGlmICh0eXBlb2Ygc2VsZi5XZWJTb2NrZXQgIT09IFwidW5kZWZpbmVkXCIpXG4gICAgICAgIHJldHVybiBzZWxmLldlYlNvY2tldDtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJgV2ViU29ja2V0YCBpcyBub3Qgc3VwcG9ydGVkIGluIHRoaXMgZW52aXJvbm1lbnRcIik7XG59XG4vLyMgc291cmNlTWFwcGluZ1VSTD11dGlscy5qcy5tYXAiXSwibmFtZXMiOltdLCJpZ25vcmVMaXN0IjpbMF0sInNvdXJjZVJvb3QiOiIifQ==\n//# sourceURL=webpack-internal:///(rsc)/../../node_modules/isows/_esm/utils.js\n");

/***/ })

};
;