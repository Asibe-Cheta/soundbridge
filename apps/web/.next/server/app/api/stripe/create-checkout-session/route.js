/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
(() => {
var exports = {};
exports.id = "app/api/stripe/create-checkout-session/route";
exports.ids = ["app/api/stripe/create-checkout-session/route"];
exports.modules = {

/***/ "(rsc)/../../node_modules/next/dist/build/webpack/loaders/next-app-loader/index.js?name=app%2Fapi%2Fstripe%2Fcreate-checkout-session%2Froute&page=%2Fapi%2Fstripe%2Fcreate-checkout-session%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Fstripe%2Fcreate-checkout-session%2Froute.ts&appDir=C%3A%5CUsers%5Civone%5COneDrive%5CDocuments%5Csoundbridge%5Capps%5Cweb%5Capp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=C%3A%5CUsers%5Civone%5COneDrive%5CDocuments%5Csoundbridge%5Capps%5Cweb&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D!":
/*!**********************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************!*\
  !*** ../../node_modules/next/dist/build/webpack/loaders/next-app-loader/index.js?name=app%2Fapi%2Fstripe%2Fcreate-checkout-session%2Froute&page=%2Fapi%2Fstripe%2Fcreate-checkout-session%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Fstripe%2Fcreate-checkout-session%2Froute.ts&appDir=C%3A%5CUsers%5Civone%5COneDrive%5CDocuments%5Csoundbridge%5Capps%5Cweb%5Capp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=C%3A%5CUsers%5Civone%5COneDrive%5CDocuments%5Csoundbridge%5Capps%5Cweb&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D! ***!
  \**********************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   patchFetch: () => (/* binding */ patchFetch),\n/* harmony export */   routeModule: () => (/* binding */ routeModule),\n/* harmony export */   serverHooks: () => (/* binding */ serverHooks),\n/* harmony export */   workAsyncStorage: () => (/* binding */ workAsyncStorage),\n/* harmony export */   workUnitAsyncStorage: () => (/* binding */ workUnitAsyncStorage)\n/* harmony export */ });\n/* harmony import */ var next_dist_server_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! next/dist/server/route-modules/app-route/module.compiled */ \"(rsc)/../../node_modules/next/dist/server/route-modules/app-route/module.compiled.js\");\n/* harmony import */ var next_dist_server_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(next_dist_server_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0__);\n/* harmony import */ var next_dist_server_route_kind__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! next/dist/server/route-kind */ \"(rsc)/../../node_modules/next/dist/server/route-kind.js\");\n/* harmony import */ var next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! next/dist/server/lib/patch-fetch */ \"(rsc)/../../node_modules/next/dist/server/lib/patch-fetch.js\");\n/* harmony import */ var next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2__);\n/* harmony import */ var C_Users_ivone_OneDrive_Documents_soundbridge_apps_web_app_api_stripe_create_checkout_session_route_ts__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./app/api/stripe/create-checkout-session/route.ts */ \"(rsc)/./app/api/stripe/create-checkout-session/route.ts\");\n\n\n\n\n// We inject the nextConfigOutput here so that we can use them in the route\n// module.\nconst nextConfigOutput = \"\"\nconst routeModule = new next_dist_server_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0__.AppRouteRouteModule({\n    definition: {\n        kind: next_dist_server_route_kind__WEBPACK_IMPORTED_MODULE_1__.RouteKind.APP_ROUTE,\n        page: \"/api/stripe/create-checkout-session/route\",\n        pathname: \"/api/stripe/create-checkout-session\",\n        filename: \"route\",\n        bundlePath: \"app/api/stripe/create-checkout-session/route\"\n    },\n    resolvedPagePath: \"C:\\\\Users\\\\ivone\\\\OneDrive\\\\Documents\\\\soundbridge\\\\apps\\\\web\\\\app\\\\api\\\\stripe\\\\create-checkout-session\\\\route.ts\",\n    nextConfigOutput,\n    userland: C_Users_ivone_OneDrive_Documents_soundbridge_apps_web_app_api_stripe_create_checkout_session_route_ts__WEBPACK_IMPORTED_MODULE_3__\n});\n// Pull out the exports that we need to expose from the module. This should\n// be eliminated when we've moved the other routes to the new format. These\n// are used to hook into the route.\nconst { workAsyncStorage, workUnitAsyncStorage, serverHooks } = routeModule;\nfunction patchFetch() {\n    return (0,next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2__.patchFetch)({\n        workAsyncStorage,\n        workUnitAsyncStorage\n    });\n}\n\n\n//# sourceMappingURL=app-route.js.map//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi4vLi4vbm9kZV9tb2R1bGVzL25leHQvZGlzdC9idWlsZC93ZWJwYWNrL2xvYWRlcnMvbmV4dC1hcHAtbG9hZGVyL2luZGV4LmpzP25hbWU9YXBwJTJGYXBpJTJGc3RyaXBlJTJGY3JlYXRlLWNoZWNrb3V0LXNlc3Npb24lMkZyb3V0ZSZwYWdlPSUyRmFwaSUyRnN0cmlwZSUyRmNyZWF0ZS1jaGVja291dC1zZXNzaW9uJTJGcm91dGUmYXBwUGF0aHM9JnBhZ2VQYXRoPXByaXZhdGUtbmV4dC1hcHAtZGlyJTJGYXBpJTJGc3RyaXBlJTJGY3JlYXRlLWNoZWNrb3V0LXNlc3Npb24lMkZyb3V0ZS50cyZhcHBEaXI9QyUzQSU1Q1VzZXJzJTVDaXZvbmUlNUNPbmVEcml2ZSU1Q0RvY3VtZW50cyU1Q3NvdW5kYnJpZGdlJTVDYXBwcyU1Q3dlYiU1Q2FwcCZwYWdlRXh0ZW5zaW9ucz10c3gmcGFnZUV4dGVuc2lvbnM9dHMmcGFnZUV4dGVuc2lvbnM9anN4JnBhZ2VFeHRlbnNpb25zPWpzJnJvb3REaXI9QyUzQSU1Q1VzZXJzJTVDaXZvbmUlNUNPbmVEcml2ZSU1Q0RvY3VtZW50cyU1Q3NvdW5kYnJpZGdlJTVDYXBwcyU1Q3dlYiZpc0Rldj10cnVlJnRzY29uZmlnUGF0aD10c2NvbmZpZy5qc29uJmJhc2VQYXRoPSZhc3NldFByZWZpeD0mbmV4dENvbmZpZ091dHB1dD0mcHJlZmVycmVkUmVnaW9uPSZtaWRkbGV3YXJlQ29uZmlnPWUzMCUzRCEiLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7QUFBK0Y7QUFDdkM7QUFDcUI7QUFDa0U7QUFDL0k7QUFDQTtBQUNBO0FBQ0Esd0JBQXdCLHlHQUFtQjtBQUMzQztBQUNBLGNBQWMsa0VBQVM7QUFDdkI7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFLO0FBQ0w7QUFDQTtBQUNBLFlBQVk7QUFDWixDQUFDO0FBQ0Q7QUFDQTtBQUNBO0FBQ0EsUUFBUSxzREFBc0Q7QUFDOUQ7QUFDQSxXQUFXLDRFQUFXO0FBQ3RCO0FBQ0E7QUFDQSxLQUFLO0FBQ0w7QUFDMEY7O0FBRTFGIiwic291cmNlcyI6WyIiXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgQXBwUm91dGVSb3V0ZU1vZHVsZSB9IGZyb20gXCJuZXh0L2Rpc3Qvc2VydmVyL3JvdXRlLW1vZHVsZXMvYXBwLXJvdXRlL21vZHVsZS5jb21waWxlZFwiO1xuaW1wb3J0IHsgUm91dGVLaW5kIH0gZnJvbSBcIm5leHQvZGlzdC9zZXJ2ZXIvcm91dGUta2luZFwiO1xuaW1wb3J0IHsgcGF0Y2hGZXRjaCBhcyBfcGF0Y2hGZXRjaCB9IGZyb20gXCJuZXh0L2Rpc3Qvc2VydmVyL2xpYi9wYXRjaC1mZXRjaFwiO1xuaW1wb3J0ICogYXMgdXNlcmxhbmQgZnJvbSBcIkM6XFxcXFVzZXJzXFxcXGl2b25lXFxcXE9uZURyaXZlXFxcXERvY3VtZW50c1xcXFxzb3VuZGJyaWRnZVxcXFxhcHBzXFxcXHdlYlxcXFxhcHBcXFxcYXBpXFxcXHN0cmlwZVxcXFxjcmVhdGUtY2hlY2tvdXQtc2Vzc2lvblxcXFxyb3V0ZS50c1wiO1xuLy8gV2UgaW5qZWN0IHRoZSBuZXh0Q29uZmlnT3V0cHV0IGhlcmUgc28gdGhhdCB3ZSBjYW4gdXNlIHRoZW0gaW4gdGhlIHJvdXRlXG4vLyBtb2R1bGUuXG5jb25zdCBuZXh0Q29uZmlnT3V0cHV0ID0gXCJcIlxuY29uc3Qgcm91dGVNb2R1bGUgPSBuZXcgQXBwUm91dGVSb3V0ZU1vZHVsZSh7XG4gICAgZGVmaW5pdGlvbjoge1xuICAgICAgICBraW5kOiBSb3V0ZUtpbmQuQVBQX1JPVVRFLFxuICAgICAgICBwYWdlOiBcIi9hcGkvc3RyaXBlL2NyZWF0ZS1jaGVja291dC1zZXNzaW9uL3JvdXRlXCIsXG4gICAgICAgIHBhdGhuYW1lOiBcIi9hcGkvc3RyaXBlL2NyZWF0ZS1jaGVja291dC1zZXNzaW9uXCIsXG4gICAgICAgIGZpbGVuYW1lOiBcInJvdXRlXCIsXG4gICAgICAgIGJ1bmRsZVBhdGg6IFwiYXBwL2FwaS9zdHJpcGUvY3JlYXRlLWNoZWNrb3V0LXNlc3Npb24vcm91dGVcIlxuICAgIH0sXG4gICAgcmVzb2x2ZWRQYWdlUGF0aDogXCJDOlxcXFxVc2Vyc1xcXFxpdm9uZVxcXFxPbmVEcml2ZVxcXFxEb2N1bWVudHNcXFxcc291bmRicmlkZ2VcXFxcYXBwc1xcXFx3ZWJcXFxcYXBwXFxcXGFwaVxcXFxzdHJpcGVcXFxcY3JlYXRlLWNoZWNrb3V0LXNlc3Npb25cXFxccm91dGUudHNcIixcbiAgICBuZXh0Q29uZmlnT3V0cHV0LFxuICAgIHVzZXJsYW5kXG59KTtcbi8vIFB1bGwgb3V0IHRoZSBleHBvcnRzIHRoYXQgd2UgbmVlZCB0byBleHBvc2UgZnJvbSB0aGUgbW9kdWxlLiBUaGlzIHNob3VsZFxuLy8gYmUgZWxpbWluYXRlZCB3aGVuIHdlJ3ZlIG1vdmVkIHRoZSBvdGhlciByb3V0ZXMgdG8gdGhlIG5ldyBmb3JtYXQuIFRoZXNlXG4vLyBhcmUgdXNlZCB0byBob29rIGludG8gdGhlIHJvdXRlLlxuY29uc3QgeyB3b3JrQXN5bmNTdG9yYWdlLCB3b3JrVW5pdEFzeW5jU3RvcmFnZSwgc2VydmVySG9va3MgfSA9IHJvdXRlTW9kdWxlO1xuZnVuY3Rpb24gcGF0Y2hGZXRjaCgpIHtcbiAgICByZXR1cm4gX3BhdGNoRmV0Y2goe1xuICAgICAgICB3b3JrQXN5bmNTdG9yYWdlLFxuICAgICAgICB3b3JrVW5pdEFzeW5jU3RvcmFnZVxuICAgIH0pO1xufVxuZXhwb3J0IHsgcm91dGVNb2R1bGUsIHdvcmtBc3luY1N0b3JhZ2UsIHdvcmtVbml0QXN5bmNTdG9yYWdlLCBzZXJ2ZXJIb29rcywgcGF0Y2hGZXRjaCwgIH07XG5cbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWFwcC1yb3V0ZS5qcy5tYXAiXSwibmFtZXMiOltdLCJpZ25vcmVMaXN0IjpbXSwic291cmNlUm9vdCI6IiJ9\n//# sourceURL=webpack-internal:///(rsc)/../../node_modules/next/dist/build/webpack/loaders/next-app-loader/index.js?name=app%2Fapi%2Fstripe%2Fcreate-checkout-session%2Froute&page=%2Fapi%2Fstripe%2Fcreate-checkout-session%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Fstripe%2Fcreate-checkout-session%2Froute.ts&appDir=C%3A%5CUsers%5Civone%5COneDrive%5CDocuments%5Csoundbridge%5Capps%5Cweb%5Capp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=C%3A%5CUsers%5Civone%5COneDrive%5CDocuments%5Csoundbridge%5Capps%5Cweb&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D!\n");

/***/ }),

/***/ "(rsc)/../../node_modules/next/dist/build/webpack/loaders/next-flight-client-entry-loader.js?server=true!":
/*!**********************************************************************************************************!*\
  !*** ../../node_modules/next/dist/build/webpack/loaders/next-flight-client-entry-loader.js?server=true! ***!
  \**********************************************************************************************************/
/***/ (() => {



/***/ }),

/***/ "(rsc)/./app/api/stripe/create-checkout-session/route.ts":
/*!*********************************************************!*\
  !*** ./app/api/stripe/create-checkout-session/route.ts ***!
  \*********************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   OPTIONS: () => (/* binding */ OPTIONS),\n/* harmony export */   POST: () => (/* binding */ POST)\n/* harmony export */ });\n/* harmony import */ var next_server__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! next/server */ \"(rsc)/../../node_modules/next/dist/api/server.js\");\n/* harmony import */ var _supabase_auth_helpers_nextjs__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @supabase/auth-helpers-nextjs */ \"(rsc)/../../node_modules/@supabase/auth-helpers-nextjs/dist/index.js\");\n/* harmony import */ var _supabase_auth_helpers_nextjs__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_supabase_auth_helpers_nextjs__WEBPACK_IMPORTED_MODULE_1__);\n/* harmony import */ var _supabase_supabase_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! @supabase/supabase-js */ \"(rsc)/../../node_modules/@supabase/supabase-js/dist/module/index.js\");\n/* harmony import */ var next_headers__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! next/headers */ \"(rsc)/../../node_modules/next/dist/api/headers.js\");\n/* harmony import */ var _src_lib_stripe__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../../../../src/lib/stripe */ \"(rsc)/./src/lib/stripe.ts\");\n\n\n\n\n\nasync function POST(request) {\n    // Add CORS headers for mobile app\n    const corsHeaders = {\n        'Access-Control-Allow-Origin': '*',\n        'Access-Control-Allow-Methods': 'POST, OPTIONS',\n        'Access-Control-Allow-Headers': 'Content-Type, Authorization'\n    };\n    try {\n        // Check if Stripe is configured\n        if (!_src_lib_stripe__WEBPACK_IMPORTED_MODULE_3__.stripe) {\n            return next_server__WEBPACK_IMPORTED_MODULE_0__.NextResponse.json({\n                error: 'Stripe is not configured. Please add STRIPE_SECRET_KEY to your environment variables.'\n            }, {\n                status: 500,\n                headers: corsHeaders\n            });\n        }\n        const { plan, billingCycle } = await request.json();\n        // Validate input\n        if (!plan || !billingCycle) {\n            return next_server__WEBPACK_IMPORTED_MODULE_0__.NextResponse.json({\n                error: 'Plan and billing cycle are required'\n            }, {\n                status: 400,\n                headers: corsHeaders\n            });\n        }\n        if (![\n            'pro',\n            'enterprise'\n        ].includes(plan)) {\n            return next_server__WEBPACK_IMPORTED_MODULE_0__.NextResponse.json({\n                error: 'Invalid plan. Must be \"pro\" or \"enterprise\"'\n            }, {\n                status: 400,\n                headers: corsHeaders\n            });\n        }\n        if (![\n            'monthly',\n            'yearly'\n        ].includes(billingCycle)) {\n            return next_server__WEBPACK_IMPORTED_MODULE_0__.NextResponse.json({\n                error: 'Invalid billing cycle. Must be \"monthly\" or \"yearly\"'\n            }, {\n                status: 400,\n                headers: corsHeaders\n            });\n        }\n        // Get user from Supabase - support both cookie and Bearer token auth\n        let user;\n        let authError;\n        // Check for Authorization header (mobile app)\n        const authHeader = request.headers.get('authorization');\n        if (authHeader && authHeader.startsWith('Bearer ')) {\n            const token = authHeader.substring(7);\n            // Create a fresh Supabase client with the provided token\n            const supabase = (0,_supabase_supabase_js__WEBPACK_IMPORTED_MODULE_4__.createClient)(\"https://aunxdbqukbxyyiusaeqi.supabase.co\", \"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF1bnhkYnF1a2J4eXlpdXNhZXFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2OTA2MTUsImV4cCI6MjA2ODI2NjYxNX0.IP-c4_S7Fkbq6F2UkgzL-TibkoBN49yQ1Cqz4CkMzB0\", {\n                global: {\n                    headers: {\n                        Authorization: `Bearer ${token}`\n                    }\n                }\n            });\n            // Get user with the token\n            const { data, error } = await supabase.auth.getUser(token);\n            user = data.user;\n            authError = error;\n        } else {\n            // Use cookie-based auth (web app)\n            const supabase = (0,_supabase_auth_helpers_nextjs__WEBPACK_IMPORTED_MODULE_1__.createServerComponentClient)({\n                cookies: next_headers__WEBPACK_IMPORTED_MODULE_2__.cookies\n            });\n            const { data, error } = await supabase.auth.getUser();\n            user = data.user;\n            authError = error;\n        }\n        if (authError || !user) {\n            return next_server__WEBPACK_IMPORTED_MODULE_0__.NextResponse.json({\n                error: 'User not authenticated'\n            }, {\n                status: 401,\n                headers: corsHeaders\n            });\n        }\n        // Get price ID\n        const priceId = (0,_src_lib_stripe__WEBPACK_IMPORTED_MODULE_3__.getPriceId)(plan, billingCycle);\n        // Create Stripe Checkout session\n        const session = await _src_lib_stripe__WEBPACK_IMPORTED_MODULE_3__.stripe.checkout.sessions.create({\n            payment_method_types: [\n                'card'\n            ],\n            line_items: [\n                {\n                    price: priceId,\n                    quantity: 1\n                }\n            ],\n            mode: 'subscription',\n            success_url: `${request.nextUrl.origin}/dashboard?tab=subscription&success=true`,\n            cancel_url: `${request.nextUrl.origin}/pricing?cancelled=true`,\n            customer_email: user.email,\n            metadata: {\n                userId: user.id,\n                plan,\n                billingCycle\n            },\n            subscription_data: {\n                metadata: {\n                    userId: user.id,\n                    plan,\n                    billingCycle\n                }\n            },\n            allow_promotion_codes: true,\n            billing_address_collection: 'auto',\n            tax_id_collection: {\n                enabled: true\n            }\n        });\n        return next_server__WEBPACK_IMPORTED_MODULE_0__.NextResponse.json({\n            sessionId: session.id,\n            url: session.url\n        }, {\n            headers: corsHeaders\n        });\n    } catch (error) {\n        console.error('Error creating checkout session:', error);\n        return next_server__WEBPACK_IMPORTED_MODULE_0__.NextResponse.json({\n            error: 'Failed to create checkout session'\n        }, {\n            status: 500,\n            headers: corsHeaders\n        });\n    }\n}\n// Handle preflight CORS requests\nasync function OPTIONS(request) {\n    return new next_server__WEBPACK_IMPORTED_MODULE_0__.NextResponse(null, {\n        status: 200,\n        headers: {\n            'Access-Control-Allow-Origin': '*',\n            'Access-Control-Allow-Methods': 'POST, OPTIONS',\n            'Access-Control-Allow-Headers': 'Content-Type, Authorization'\n        }\n    });\n}\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi9hcHAvYXBpL3N0cmlwZS9jcmVhdGUtY2hlY2tvdXQtc2Vzc2lvbi9yb3V0ZS50cyIsIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7OztBQUF3RDtBQUNvQjtBQUN2QjtBQUNkO0FBQ3lCO0FBRXpELGVBQWVNLEtBQUtDLE9BQW9CO0lBQzdDLGtDQUFrQztJQUNsQyxNQUFNQyxjQUFjO1FBQ2xCLCtCQUErQjtRQUMvQixnQ0FBZ0M7UUFDaEMsZ0NBQWdDO0lBQ2xDO0lBRUEsSUFBSTtRQUNGLGdDQUFnQztRQUNoQyxJQUFJLENBQUNKLG1EQUFNQSxFQUFFO1lBQ1gsT0FBT0oscURBQVlBLENBQUNTLElBQUksQ0FDdEI7Z0JBQUVDLE9BQU87WUFBd0YsR0FDakc7Z0JBQUVDLFFBQVE7Z0JBQUtDLFNBQVNKO1lBQVk7UUFFeEM7UUFFQSxNQUFNLEVBQUVLLElBQUksRUFBRUMsWUFBWSxFQUFFLEdBQUcsTUFBTVAsUUFBUUUsSUFBSTtRQUVqRCxpQkFBaUI7UUFDakIsSUFBSSxDQUFDSSxRQUFRLENBQUNDLGNBQWM7WUFDMUIsT0FBT2QscURBQVlBLENBQUNTLElBQUksQ0FDdEI7Z0JBQUVDLE9BQU87WUFBc0MsR0FDL0M7Z0JBQUVDLFFBQVE7Z0JBQUtDLFNBQVNKO1lBQVk7UUFFeEM7UUFFQSxJQUFJLENBQUM7WUFBQztZQUFPO1NBQWEsQ0FBQ08sUUFBUSxDQUFDRixPQUFPO1lBQ3pDLE9BQU9iLHFEQUFZQSxDQUFDUyxJQUFJLENBQ3RCO2dCQUFFQyxPQUFPO1lBQThDLEdBQ3ZEO2dCQUFFQyxRQUFRO2dCQUFLQyxTQUFTSjtZQUFZO1FBRXhDO1FBRUEsSUFBSSxDQUFDO1lBQUM7WUFBVztTQUFTLENBQUNPLFFBQVEsQ0FBQ0QsZUFBZTtZQUNqRCxPQUFPZCxxREFBWUEsQ0FBQ1MsSUFBSSxDQUN0QjtnQkFBRUMsT0FBTztZQUF1RCxHQUNoRTtnQkFBRUMsUUFBUTtnQkFBS0MsU0FBU0o7WUFBWTtRQUV4QztRQUVBLHFFQUFxRTtRQUNyRSxJQUFJUTtRQUNKLElBQUlDO1FBRUosOENBQThDO1FBQzlDLE1BQU1DLGFBQWFYLFFBQVFLLE9BQU8sQ0FBQ08sR0FBRyxDQUFDO1FBQ3ZDLElBQUlELGNBQWNBLFdBQVdFLFVBQVUsQ0FBQyxZQUFZO1lBQ2xELE1BQU1DLFFBQVFILFdBQVdJLFNBQVMsQ0FBQztZQUVuQyx5REFBeUQ7WUFDekQsTUFBTUMsV0FBV3JCLG1FQUFZQSxDQUMzQnNCLDBDQUFvQyxFQUNwQ0Esa05BQXlDLEVBQ3pDO2dCQUNFSSxRQUFRO29CQUNOaEIsU0FBUzt3QkFDUGlCLGVBQWUsQ0FBQyxPQUFPLEVBQUVSLE9BQU87b0JBQ2xDO2dCQUNGO1lBQ0Y7WUFHRiwwQkFBMEI7WUFDMUIsTUFBTSxFQUFFUyxJQUFJLEVBQUVwQixLQUFLLEVBQUUsR0FBRyxNQUFNYSxTQUFTUSxJQUFJLENBQUNDLE9BQU8sQ0FBQ1g7WUFDcERMLE9BQU9jLEtBQUtkLElBQUk7WUFDaEJDLFlBQVlQO1FBQ2QsT0FBTztZQUNMLGtDQUFrQztZQUNsQyxNQUFNYSxXQUFXdEIsMEZBQTJCQSxDQUFDO2dCQUFFRSxPQUFPQSxtREFBQUE7WUFBQztZQUN2RCxNQUFNLEVBQUUyQixJQUFJLEVBQUVwQixLQUFLLEVBQUUsR0FBRyxNQUFNYSxTQUFTUSxJQUFJLENBQUNDLE9BQU87WUFDbkRoQixPQUFPYyxLQUFLZCxJQUFJO1lBQ2hCQyxZQUFZUDtRQUNkO1FBRUEsSUFBSU8sYUFBYSxDQUFDRCxNQUFNO1lBQ3RCLE9BQU9oQixxREFBWUEsQ0FBQ1MsSUFBSSxDQUN0QjtnQkFBRUMsT0FBTztZQUF5QixHQUNsQztnQkFBRUMsUUFBUTtnQkFBS0MsU0FBU0o7WUFBWTtRQUV4QztRQUVBLGVBQWU7UUFDZixNQUFNeUIsVUFBVTVCLDJEQUFVQSxDQUFDUSxNQUE4QkM7UUFFekQsaUNBQWlDO1FBQ2pDLE1BQU1vQixVQUFVLE1BQU05QixtREFBTUEsQ0FBQytCLFFBQVEsQ0FBQ0MsUUFBUSxDQUFDQyxNQUFNLENBQUM7WUFDcERDLHNCQUFzQjtnQkFBQzthQUFPO1lBQzlCQyxZQUFZO2dCQUNWO29CQUNFQyxPQUFPUDtvQkFDUFEsVUFBVTtnQkFDWjthQUNEO1lBQ0RDLE1BQU07WUFDTkMsYUFBYSxHQUFHcEMsUUFBUXFDLE9BQU8sQ0FBQ0MsTUFBTSxDQUFDLHdDQUF3QyxDQUFDO1lBQ2hGQyxZQUFZLEdBQUd2QyxRQUFRcUMsT0FBTyxDQUFDQyxNQUFNLENBQUMsdUJBQXVCLENBQUM7WUFDOURFLGdCQUFnQi9CLEtBQUtnQyxLQUFLO1lBQzFCQyxVQUFVO2dCQUNSQyxRQUFRbEMsS0FBS21DLEVBQUU7Z0JBQ2Z0QztnQkFDQUM7WUFDRjtZQUNBc0MsbUJBQW1CO2dCQUNqQkgsVUFBVTtvQkFDUkMsUUFBUWxDLEtBQUttQyxFQUFFO29CQUNmdEM7b0JBQ0FDO2dCQUNGO1lBQ0Y7WUFDQXVDLHVCQUF1QjtZQUN2QkMsNEJBQTRCO1lBQzVCQyxtQkFBbUI7Z0JBQ2pCQyxTQUFTO1lBQ1g7UUFDRjtRQUVBLE9BQU94RCxxREFBWUEsQ0FBQ1MsSUFBSSxDQUFDO1lBQ3ZCZ0QsV0FBV3ZCLFFBQVFpQixFQUFFO1lBQ3JCTyxLQUFLeEIsUUFBUXdCLEdBQUc7UUFDbEIsR0FBRztZQUFFOUMsU0FBU0o7UUFBWTtJQUU1QixFQUFFLE9BQU9FLE9BQU87UUFDZGlELFFBQVFqRCxLQUFLLENBQUMsb0NBQW9DQTtRQUNsRCxPQUFPVixxREFBWUEsQ0FBQ1MsSUFBSSxDQUN0QjtZQUFFQyxPQUFPO1FBQW9DLEdBQzdDO1lBQUVDLFFBQVE7WUFBS0MsU0FBU0o7UUFBWTtJQUV4QztBQUNGO0FBRUEsaUNBQWlDO0FBQzFCLGVBQWVvRCxRQUFRckQsT0FBb0I7SUFDaEQsT0FBTyxJQUFJUCxxREFBWUEsQ0FBQyxNQUFNO1FBQzVCVyxRQUFRO1FBQ1JDLFNBQVM7WUFDUCwrQkFBK0I7WUFDL0IsZ0NBQWdDO1lBQ2hDLGdDQUFnQztRQUNsQztJQUNGO0FBQ0YiLCJzb3VyY2VzIjpbIkM6XFxVc2Vyc1xcaXZvbmVcXE9uZURyaXZlXFxEb2N1bWVudHNcXHNvdW5kYnJpZGdlXFxhcHBzXFx3ZWJcXGFwcFxcYXBpXFxzdHJpcGVcXGNyZWF0ZS1jaGVja291dC1zZXNzaW9uXFxyb3V0ZS50cyJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBOZXh0UmVxdWVzdCwgTmV4dFJlc3BvbnNlIH0gZnJvbSAnbmV4dC9zZXJ2ZXInO1xyXG5pbXBvcnQgeyBjcmVhdGVTZXJ2ZXJDb21wb25lbnRDbGllbnQgfSBmcm9tICdAc3VwYWJhc2UvYXV0aC1oZWxwZXJzLW5leHRqcyc7XHJcbmltcG9ydCB7IGNyZWF0ZUNsaWVudCB9IGZyb20gJ0BzdXBhYmFzZS9zdXBhYmFzZS1qcyc7XHJcbmltcG9ydCB7IGNvb2tpZXMgfSBmcm9tICduZXh0L2hlYWRlcnMnO1xyXG5pbXBvcnQgeyBzdHJpcGUsIGdldFByaWNlSWQgfSBmcm9tICcuLi8uLi8uLi8uLi9zcmMvbGliL3N0cmlwZSc7XHJcblxyXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gUE9TVChyZXF1ZXN0OiBOZXh0UmVxdWVzdCkge1xyXG4gIC8vIEFkZCBDT1JTIGhlYWRlcnMgZm9yIG1vYmlsZSBhcHBcclxuICBjb25zdCBjb3JzSGVhZGVycyA9IHtcclxuICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nOiAnKicsXHJcbiAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctTWV0aG9kcyc6ICdQT1NULCBPUFRJT05TJyxcclxuICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1IZWFkZXJzJzogJ0NvbnRlbnQtVHlwZSwgQXV0aG9yaXphdGlvbicsXHJcbiAgfTtcclxuXHJcbiAgdHJ5IHtcclxuICAgIC8vIENoZWNrIGlmIFN0cmlwZSBpcyBjb25maWd1cmVkXHJcbiAgICBpZiAoIXN0cmlwZSkge1xyXG4gICAgICByZXR1cm4gTmV4dFJlc3BvbnNlLmpzb24oXHJcbiAgICAgICAgeyBlcnJvcjogJ1N0cmlwZSBpcyBub3QgY29uZmlndXJlZC4gUGxlYXNlIGFkZCBTVFJJUEVfU0VDUkVUX0tFWSB0byB5b3VyIGVudmlyb25tZW50IHZhcmlhYmxlcy4nIH0sXHJcbiAgICAgICAgeyBzdGF0dXM6IDUwMCwgaGVhZGVyczogY29yc0hlYWRlcnMgfVxyXG4gICAgICApO1xyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IHsgcGxhbiwgYmlsbGluZ0N5Y2xlIH0gPSBhd2FpdCByZXF1ZXN0Lmpzb24oKTtcclxuXHJcbiAgICAvLyBWYWxpZGF0ZSBpbnB1dFxyXG4gICAgaWYgKCFwbGFuIHx8ICFiaWxsaW5nQ3ljbGUpIHtcclxuICAgICAgcmV0dXJuIE5leHRSZXNwb25zZS5qc29uKFxyXG4gICAgICAgIHsgZXJyb3I6ICdQbGFuIGFuZCBiaWxsaW5nIGN5Y2xlIGFyZSByZXF1aXJlZCcgfSxcclxuICAgICAgICB7IHN0YXR1czogNDAwLCBoZWFkZXJzOiBjb3JzSGVhZGVycyB9XHJcbiAgICAgICk7XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKCFbJ3BybycsICdlbnRlcnByaXNlJ10uaW5jbHVkZXMocGxhbikpIHtcclxuICAgICAgcmV0dXJuIE5leHRSZXNwb25zZS5qc29uKFxyXG4gICAgICAgIHsgZXJyb3I6ICdJbnZhbGlkIHBsYW4uIE11c3QgYmUgXCJwcm9cIiBvciBcImVudGVycHJpc2VcIicgfSxcclxuICAgICAgICB7IHN0YXR1czogNDAwLCBoZWFkZXJzOiBjb3JzSGVhZGVycyB9XHJcbiAgICAgICk7XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKCFbJ21vbnRobHknLCAneWVhcmx5J10uaW5jbHVkZXMoYmlsbGluZ0N5Y2xlKSkge1xyXG4gICAgICByZXR1cm4gTmV4dFJlc3BvbnNlLmpzb24oXHJcbiAgICAgICAgeyBlcnJvcjogJ0ludmFsaWQgYmlsbGluZyBjeWNsZS4gTXVzdCBiZSBcIm1vbnRobHlcIiBvciBcInllYXJseVwiJyB9LFxyXG4gICAgICAgIHsgc3RhdHVzOiA0MDAsIGhlYWRlcnM6IGNvcnNIZWFkZXJzIH1cclxuICAgICAgKTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBHZXQgdXNlciBmcm9tIFN1cGFiYXNlIC0gc3VwcG9ydCBib3RoIGNvb2tpZSBhbmQgQmVhcmVyIHRva2VuIGF1dGhcclxuICAgIGxldCB1c2VyO1xyXG4gICAgbGV0IGF1dGhFcnJvcjtcclxuXHJcbiAgICAvLyBDaGVjayBmb3IgQXV0aG9yaXphdGlvbiBoZWFkZXIgKG1vYmlsZSBhcHApXHJcbiAgICBjb25zdCBhdXRoSGVhZGVyID0gcmVxdWVzdC5oZWFkZXJzLmdldCgnYXV0aG9yaXphdGlvbicpO1xyXG4gICAgaWYgKGF1dGhIZWFkZXIgJiYgYXV0aEhlYWRlci5zdGFydHNXaXRoKCdCZWFyZXIgJykpIHtcclxuICAgICAgY29uc3QgdG9rZW4gPSBhdXRoSGVhZGVyLnN1YnN0cmluZyg3KTtcclxuICAgICAgXHJcbiAgICAgIC8vIENyZWF0ZSBhIGZyZXNoIFN1cGFiYXNlIGNsaWVudCB3aXRoIHRoZSBwcm92aWRlZCB0b2tlblxyXG4gICAgICBjb25zdCBzdXBhYmFzZSA9IGNyZWF0ZUNsaWVudChcclxuICAgICAgICBwcm9jZXNzLmVudi5ORVhUX1BVQkxJQ19TVVBBQkFTRV9VUkwhLFxyXG4gICAgICAgIHByb2Nlc3MuZW52Lk5FWFRfUFVCTElDX1NVUEFCQVNFX0FOT05fS0VZISxcclxuICAgICAgICB7XHJcbiAgICAgICAgICBnbG9iYWw6IHtcclxuICAgICAgICAgICAgaGVhZGVyczoge1xyXG4gICAgICAgICAgICAgIEF1dGhvcml6YXRpb246IGBCZWFyZXIgJHt0b2tlbn1gLFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgfSxcclxuICAgICAgICB9XHJcbiAgICAgICk7XHJcbiAgICAgIFxyXG4gICAgICAvLyBHZXQgdXNlciB3aXRoIHRoZSB0b2tlblxyXG4gICAgICBjb25zdCB7IGRhdGEsIGVycm9yIH0gPSBhd2FpdCBzdXBhYmFzZS5hdXRoLmdldFVzZXIodG9rZW4pO1xyXG4gICAgICB1c2VyID0gZGF0YS51c2VyO1xyXG4gICAgICBhdXRoRXJyb3IgPSBlcnJvcjtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIC8vIFVzZSBjb29raWUtYmFzZWQgYXV0aCAod2ViIGFwcClcclxuICAgICAgY29uc3Qgc3VwYWJhc2UgPSBjcmVhdGVTZXJ2ZXJDb21wb25lbnRDbGllbnQoeyBjb29raWVzIH0pO1xyXG4gICAgICBjb25zdCB7IGRhdGEsIGVycm9yIH0gPSBhd2FpdCBzdXBhYmFzZS5hdXRoLmdldFVzZXIoKTtcclxuICAgICAgdXNlciA9IGRhdGEudXNlcjtcclxuICAgICAgYXV0aEVycm9yID0gZXJyb3I7XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKGF1dGhFcnJvciB8fCAhdXNlcikge1xyXG4gICAgICByZXR1cm4gTmV4dFJlc3BvbnNlLmpzb24oXHJcbiAgICAgICAgeyBlcnJvcjogJ1VzZXIgbm90IGF1dGhlbnRpY2F0ZWQnIH0sXHJcbiAgICAgICAgeyBzdGF0dXM6IDQwMSwgaGVhZGVyczogY29yc0hlYWRlcnMgfVxyXG4gICAgICApO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIEdldCBwcmljZSBJRFxyXG4gICAgY29uc3QgcHJpY2VJZCA9IGdldFByaWNlSWQocGxhbiBhcyAncHJvJyB8ICdlbnRlcnByaXNlJywgYmlsbGluZ0N5Y2xlIGFzICdtb250aGx5JyB8ICd5ZWFybHknKTtcclxuXHJcbiAgICAvLyBDcmVhdGUgU3RyaXBlIENoZWNrb3V0IHNlc3Npb25cclxuICAgIGNvbnN0IHNlc3Npb24gPSBhd2FpdCBzdHJpcGUuY2hlY2tvdXQuc2Vzc2lvbnMuY3JlYXRlKHtcclxuICAgICAgcGF5bWVudF9tZXRob2RfdHlwZXM6IFsnY2FyZCddLFxyXG4gICAgICBsaW5lX2l0ZW1zOiBbXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgcHJpY2U6IHByaWNlSWQsXHJcbiAgICAgICAgICBxdWFudGl0eTogMSxcclxuICAgICAgICB9LFxyXG4gICAgICBdLFxyXG4gICAgICBtb2RlOiAnc3Vic2NyaXB0aW9uJyxcclxuICAgICAgc3VjY2Vzc191cmw6IGAke3JlcXVlc3QubmV4dFVybC5vcmlnaW59L2Rhc2hib2FyZD90YWI9c3Vic2NyaXB0aW9uJnN1Y2Nlc3M9dHJ1ZWAsXHJcbiAgICAgIGNhbmNlbF91cmw6IGAke3JlcXVlc3QubmV4dFVybC5vcmlnaW59L3ByaWNpbmc/Y2FuY2VsbGVkPXRydWVgLFxyXG4gICAgICBjdXN0b21lcl9lbWFpbDogdXNlci5lbWFpbCxcclxuICAgICAgbWV0YWRhdGE6IHtcclxuICAgICAgICB1c2VySWQ6IHVzZXIuaWQsXHJcbiAgICAgICAgcGxhbixcclxuICAgICAgICBiaWxsaW5nQ3ljbGUsXHJcbiAgICAgIH0sXHJcbiAgICAgIHN1YnNjcmlwdGlvbl9kYXRhOiB7XHJcbiAgICAgICAgbWV0YWRhdGE6IHtcclxuICAgICAgICAgIHVzZXJJZDogdXNlci5pZCxcclxuICAgICAgICAgIHBsYW4sXHJcbiAgICAgICAgICBiaWxsaW5nQ3ljbGUsXHJcbiAgICAgICAgfSxcclxuICAgICAgfSxcclxuICAgICAgYWxsb3dfcHJvbW90aW9uX2NvZGVzOiB0cnVlLFxyXG4gICAgICBiaWxsaW5nX2FkZHJlc3NfY29sbGVjdGlvbjogJ2F1dG8nLFxyXG4gICAgICB0YXhfaWRfY29sbGVjdGlvbjoge1xyXG4gICAgICAgIGVuYWJsZWQ6IHRydWUsXHJcbiAgICAgIH0sXHJcbiAgICB9KTtcclxuXHJcbiAgICByZXR1cm4gTmV4dFJlc3BvbnNlLmpzb24oeyBcclxuICAgICAgc2Vzc2lvbklkOiBzZXNzaW9uLmlkLFxyXG4gICAgICB1cmw6IHNlc3Npb24udXJsIFxyXG4gICAgfSwgeyBoZWFkZXJzOiBjb3JzSGVhZGVycyB9KTtcclxuXHJcbiAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIGNyZWF0aW5nIGNoZWNrb3V0IHNlc3Npb246JywgZXJyb3IpO1xyXG4gICAgcmV0dXJuIE5leHRSZXNwb25zZS5qc29uKFxyXG4gICAgICB7IGVycm9yOiAnRmFpbGVkIHRvIGNyZWF0ZSBjaGVja291dCBzZXNzaW9uJyB9LFxyXG4gICAgICB7IHN0YXR1czogNTAwLCBoZWFkZXJzOiBjb3JzSGVhZGVycyB9XHJcbiAgICApO1xyXG4gIH1cclxufVxyXG5cclxuLy8gSGFuZGxlIHByZWZsaWdodCBDT1JTIHJlcXVlc3RzXHJcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBPUFRJT05TKHJlcXVlc3Q6IE5leHRSZXF1ZXN0KSB7XHJcbiAgcmV0dXJuIG5ldyBOZXh0UmVzcG9uc2UobnVsbCwge1xyXG4gICAgc3RhdHVzOiAyMDAsXHJcbiAgICBoZWFkZXJzOiB7XHJcbiAgICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nOiAnKicsXHJcbiAgICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1NZXRob2RzJzogJ1BPU1QsIE9QVElPTlMnLFxyXG4gICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctSGVhZGVycyc6ICdDb250ZW50LVR5cGUsIEF1dGhvcml6YXRpb24nLFxyXG4gICAgfSxcclxuICB9KTtcclxufVxyXG4iXSwibmFtZXMiOlsiTmV4dFJlc3BvbnNlIiwiY3JlYXRlU2VydmVyQ29tcG9uZW50Q2xpZW50IiwiY3JlYXRlQ2xpZW50IiwiY29va2llcyIsInN0cmlwZSIsImdldFByaWNlSWQiLCJQT1NUIiwicmVxdWVzdCIsImNvcnNIZWFkZXJzIiwianNvbiIsImVycm9yIiwic3RhdHVzIiwiaGVhZGVycyIsInBsYW4iLCJiaWxsaW5nQ3ljbGUiLCJpbmNsdWRlcyIsInVzZXIiLCJhdXRoRXJyb3IiLCJhdXRoSGVhZGVyIiwiZ2V0Iiwic3RhcnRzV2l0aCIsInRva2VuIiwic3Vic3RyaW5nIiwic3VwYWJhc2UiLCJwcm9jZXNzIiwiZW52IiwiTkVYVF9QVUJMSUNfU1VQQUJBU0VfVVJMIiwiTkVYVF9QVUJMSUNfU1VQQUJBU0VfQU5PTl9LRVkiLCJnbG9iYWwiLCJBdXRob3JpemF0aW9uIiwiZGF0YSIsImF1dGgiLCJnZXRVc2VyIiwicHJpY2VJZCIsInNlc3Npb24iLCJjaGVja291dCIsInNlc3Npb25zIiwiY3JlYXRlIiwicGF5bWVudF9tZXRob2RfdHlwZXMiLCJsaW5lX2l0ZW1zIiwicHJpY2UiLCJxdWFudGl0eSIsIm1vZGUiLCJzdWNjZXNzX3VybCIsIm5leHRVcmwiLCJvcmlnaW4iLCJjYW5jZWxfdXJsIiwiY3VzdG9tZXJfZW1haWwiLCJlbWFpbCIsIm1ldGFkYXRhIiwidXNlcklkIiwiaWQiLCJzdWJzY3JpcHRpb25fZGF0YSIsImFsbG93X3Byb21vdGlvbl9jb2RlcyIsImJpbGxpbmdfYWRkcmVzc19jb2xsZWN0aW9uIiwidGF4X2lkX2NvbGxlY3Rpb24iLCJlbmFibGVkIiwic2Vzc2lvbklkIiwidXJsIiwiY29uc29sZSIsIk9QVElPTlMiXSwiaWdub3JlTGlzdCI6W10sInNvdXJjZVJvb3QiOiIifQ==\n//# sourceURL=webpack-internal:///(rsc)/./app/api/stripe/create-checkout-session/route.ts\n");

/***/ }),

/***/ "(rsc)/./src/lib/stripe.ts":
/*!***************************!*\
  !*** ./src/lib/stripe.ts ***!
  \***************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   STRIPE_CONFIG: () => (/* binding */ STRIPE_CONFIG),\n/* harmony export */   getPriceId: () => (/* binding */ getPriceId),\n/* harmony export */   getStripe: () => (/* binding */ getStripe),\n/* harmony export */   stripe: () => (/* binding */ stripe)\n/* harmony export */ });\n/* harmony import */ var stripe__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! stripe */ \"(rsc)/../../node_modules/stripe/esm/stripe.esm.node.js\");\n\n// Server-side Stripe instance\nconst stripe = process.env.STRIPE_SECRET_KEY ? new stripe__WEBPACK_IMPORTED_MODULE_0__[\"default\"](process.env.STRIPE_SECRET_KEY, {\n    apiVersion: '2024-06-20'\n}) : null;\n// Client-side Stripe instance\nconst getStripe = async ()=>{\n    const { loadStripe } = await __webpack_require__.e(/*! import() */ \"vendor-chunks/@stripe\").then(__webpack_require__.bind(__webpack_require__, /*! @stripe/stripe-js */ \"(rsc)/../../node_modules/@stripe/stripe-js/lib/index.mjs\"));\n    const publishableKey = \"pk_live_51Rq1Oj0Bt6mXrdyeB3XD9Zs4r56x3XI1UFMJ0iU4iaMFtIegy12SYh3fZ1hX550KTpMilDd6JpJ7hkxpTIbWcEB600kBKGNN0H\";\n    if (!publishableKey) {\n        console.warn('Stripe publishable key not found. Please add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY to your environment variables.');\n        return null;\n    }\n    return loadStripe(publishableKey);\n};\n// Stripe product and price IDs (you'll need to create these in your Stripe dashboard)\nconst STRIPE_CONFIG = {\n    products: {\n        pro: process.env.STRIPE_PRO_PRODUCT_ID || 'prod_pro_placeholder',\n        enterprise: process.env.STRIPE_ENTERPRISE_PRODUCT_ID || 'prod_enterprise_placeholder'\n    },\n    prices: {\n        pro_monthly: process.env.STRIPE_PRO_MONTHLY_PRICE_ID || 'price_pro_monthly_placeholder',\n        pro_yearly: process.env.STRIPE_PRO_YEARLY_PRICE_ID || 'price_pro_yearly_placeholder',\n        enterprise_monthly: process.env.STRIPE_ENTERPRISE_MONTHLY_PRICE_ID || 'price_enterprise_monthly_placeholder',\n        enterprise_yearly: process.env.STRIPE_ENTERPRISE_YEARLY_PRICE_ID || 'price_enterprise_yearly_placeholder'\n    }\n};\n// Helper function to get price ID based on plan and billing cycle\nconst getPriceId = (plan, billingCycle)=>{\n    const key = `${plan}_${billingCycle}`;\n    return STRIPE_CONFIG.prices[key];\n};\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi9zcmMvbGliL3N0cmlwZS50cyIsIm1hcHBpbmdzIjoiOzs7Ozs7OztBQUE0QjtBQUU1Qiw4QkFBOEI7QUFDdkIsTUFBTUMsU0FBU0MsUUFBUUMsR0FBRyxDQUFDQyxpQkFBaUIsR0FDL0MsSUFBSUosOENBQU1BLENBQUNFLFFBQVFDLEdBQUcsQ0FBQ0MsaUJBQWlCLEVBQUU7SUFDeENDLFlBQVk7QUFDZCxLQUNBLEtBQUs7QUFFVCw4QkFBOEI7QUFDdkIsTUFBTUMsWUFBWTtJQUN2QixNQUFNLEVBQUVDLFVBQVUsRUFBRSxHQUFHLE1BQU0sdU1BQTJCO0lBRXhELE1BQU1DLGlCQUFpQk4sNkdBQThDO0lBRXJFLElBQUksQ0FBQ00sZ0JBQWdCO1FBQ25CRSxRQUFRQyxJQUFJLENBQUM7UUFDYixPQUFPO0lBQ1Q7SUFFQSxPQUFPSixXQUFXQztBQUNwQixFQUFFO0FBRUYsc0ZBQXNGO0FBQy9FLE1BQU1JLGdCQUFnQjtJQUMzQkMsVUFBVTtRQUNSQyxLQUFLWixRQUFRQyxHQUFHLENBQUNZLHFCQUFxQixJQUFJO1FBQzFDQyxZQUFZZCxRQUFRQyxHQUFHLENBQUNjLDRCQUE0QixJQUFJO0lBQzFEO0lBQ0FDLFFBQVE7UUFDTkMsYUFBYWpCLFFBQVFDLEdBQUcsQ0FBQ2lCLDJCQUEyQixJQUFJO1FBQ3hEQyxZQUFZbkIsUUFBUUMsR0FBRyxDQUFDbUIsMEJBQTBCLElBQUk7UUFDdERDLG9CQUFvQnJCLFFBQVFDLEdBQUcsQ0FBQ3FCLGtDQUFrQyxJQUFJO1FBQ3RFQyxtQkFBbUJ2QixRQUFRQyxHQUFHLENBQUN1QixpQ0FBaUMsSUFBSTtJQUN0RTtBQUNGLEVBQUU7QUFFRixrRUFBa0U7QUFDM0QsTUFBTUMsYUFBYSxDQUFDQyxNQUE0QkM7SUFDckQsTUFBTUMsTUFBTSxHQUFHRixLQUFLLENBQUMsRUFBRUMsY0FBYztJQUNyQyxPQUFPakIsY0FBY00sTUFBTSxDQUFDWSxJQUFJO0FBQ2xDLEVBQUUiLCJzb3VyY2VzIjpbIkM6XFxVc2Vyc1xcaXZvbmVcXE9uZURyaXZlXFxEb2N1bWVudHNcXHNvdW5kYnJpZGdlXFxhcHBzXFx3ZWJcXHNyY1xcbGliXFxzdHJpcGUudHMiXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IFN0cmlwZSBmcm9tICdzdHJpcGUnO1xyXG5cclxuLy8gU2VydmVyLXNpZGUgU3RyaXBlIGluc3RhbmNlXHJcbmV4cG9ydCBjb25zdCBzdHJpcGUgPSBwcm9jZXNzLmVudi5TVFJJUEVfU0VDUkVUX0tFWSBcclxuICA/IG5ldyBTdHJpcGUocHJvY2Vzcy5lbnYuU1RSSVBFX1NFQ1JFVF9LRVksIHtcclxuICAgICAgYXBpVmVyc2lvbjogJzIwMjQtMDYtMjAnLFxyXG4gICAgfSlcclxuICA6IG51bGw7XHJcblxyXG4vLyBDbGllbnQtc2lkZSBTdHJpcGUgaW5zdGFuY2VcclxuZXhwb3J0IGNvbnN0IGdldFN0cmlwZSA9IGFzeW5jICgpID0+IHtcclxuICBjb25zdCB7IGxvYWRTdHJpcGUgfSA9IGF3YWl0IGltcG9ydCgnQHN0cmlwZS9zdHJpcGUtanMnKTtcclxuICBcclxuICBjb25zdCBwdWJsaXNoYWJsZUtleSA9IHByb2Nlc3MuZW52Lk5FWFRfUFVCTElDX1NUUklQRV9QVUJMSVNIQUJMRV9LRVk7XHJcbiAgXHJcbiAgaWYgKCFwdWJsaXNoYWJsZUtleSkge1xyXG4gICAgY29uc29sZS53YXJuKCdTdHJpcGUgcHVibGlzaGFibGUga2V5IG5vdCBmb3VuZC4gUGxlYXNlIGFkZCBORVhUX1BVQkxJQ19TVFJJUEVfUFVCTElTSEFCTEVfS0VZIHRvIHlvdXIgZW52aXJvbm1lbnQgdmFyaWFibGVzLicpO1xyXG4gICAgcmV0dXJuIG51bGw7XHJcbiAgfVxyXG4gIFxyXG4gIHJldHVybiBsb2FkU3RyaXBlKHB1Ymxpc2hhYmxlS2V5KTtcclxufTtcclxuXHJcbi8vIFN0cmlwZSBwcm9kdWN0IGFuZCBwcmljZSBJRHMgKHlvdSdsbCBuZWVkIHRvIGNyZWF0ZSB0aGVzZSBpbiB5b3VyIFN0cmlwZSBkYXNoYm9hcmQpXHJcbmV4cG9ydCBjb25zdCBTVFJJUEVfQ09ORklHID0ge1xyXG4gIHByb2R1Y3RzOiB7XHJcbiAgICBwcm86IHByb2Nlc3MuZW52LlNUUklQRV9QUk9fUFJPRFVDVF9JRCB8fCAncHJvZF9wcm9fcGxhY2Vob2xkZXInLFxyXG4gICAgZW50ZXJwcmlzZTogcHJvY2Vzcy5lbnYuU1RSSVBFX0VOVEVSUFJJU0VfUFJPRFVDVF9JRCB8fCAncHJvZF9lbnRlcnByaXNlX3BsYWNlaG9sZGVyJyxcclxuICB9LFxyXG4gIHByaWNlczoge1xyXG4gICAgcHJvX21vbnRobHk6IHByb2Nlc3MuZW52LlNUUklQRV9QUk9fTU9OVEhMWV9QUklDRV9JRCB8fCAncHJpY2VfcHJvX21vbnRobHlfcGxhY2Vob2xkZXInLFxyXG4gICAgcHJvX3llYXJseTogcHJvY2Vzcy5lbnYuU1RSSVBFX1BST19ZRUFSTFlfUFJJQ0VfSUQgfHwgJ3ByaWNlX3Byb195ZWFybHlfcGxhY2Vob2xkZXInLFxyXG4gICAgZW50ZXJwcmlzZV9tb250aGx5OiBwcm9jZXNzLmVudi5TVFJJUEVfRU5URVJQUklTRV9NT05USExZX1BSSUNFX0lEIHx8ICdwcmljZV9lbnRlcnByaXNlX21vbnRobHlfcGxhY2Vob2xkZXInLFxyXG4gICAgZW50ZXJwcmlzZV95ZWFybHk6IHByb2Nlc3MuZW52LlNUUklQRV9FTlRFUlBSSVNFX1lFQVJMWV9QUklDRV9JRCB8fCAncHJpY2VfZW50ZXJwcmlzZV95ZWFybHlfcGxhY2Vob2xkZXInLFxyXG4gIH1cclxufTtcclxuXHJcbi8vIEhlbHBlciBmdW5jdGlvbiB0byBnZXQgcHJpY2UgSUQgYmFzZWQgb24gcGxhbiBhbmQgYmlsbGluZyBjeWNsZVxyXG5leHBvcnQgY29uc3QgZ2V0UHJpY2VJZCA9IChwbGFuOiAncHJvJyB8ICdlbnRlcnByaXNlJywgYmlsbGluZ0N5Y2xlOiAnbW9udGhseScgfCAneWVhcmx5Jyk6IHN0cmluZyA9PiB7XHJcbiAgY29uc3Qga2V5ID0gYCR7cGxhbn1fJHtiaWxsaW5nQ3ljbGV9YCBhcyBrZXlvZiB0eXBlb2YgU1RSSVBFX0NPTkZJRy5wcmljZXM7XHJcbiAgcmV0dXJuIFNUUklQRV9DT05GSUcucHJpY2VzW2tleV07XHJcbn07XHJcbiJdLCJuYW1lcyI6WyJTdHJpcGUiLCJzdHJpcGUiLCJwcm9jZXNzIiwiZW52IiwiU1RSSVBFX1NFQ1JFVF9LRVkiLCJhcGlWZXJzaW9uIiwiZ2V0U3RyaXBlIiwibG9hZFN0cmlwZSIsInB1Ymxpc2hhYmxlS2V5IiwiTkVYVF9QVUJMSUNfU1RSSVBFX1BVQkxJU0hBQkxFX0tFWSIsImNvbnNvbGUiLCJ3YXJuIiwiU1RSSVBFX0NPTkZJRyIsInByb2R1Y3RzIiwicHJvIiwiU1RSSVBFX1BST19QUk9EVUNUX0lEIiwiZW50ZXJwcmlzZSIsIlNUUklQRV9FTlRFUlBSSVNFX1BST0RVQ1RfSUQiLCJwcmljZXMiLCJwcm9fbW9udGhseSIsIlNUUklQRV9QUk9fTU9OVEhMWV9QUklDRV9JRCIsInByb195ZWFybHkiLCJTVFJJUEVfUFJPX1lFQVJMWV9QUklDRV9JRCIsImVudGVycHJpc2VfbW9udGhseSIsIlNUUklQRV9FTlRFUlBSSVNFX01PTlRITFlfUFJJQ0VfSUQiLCJlbnRlcnByaXNlX3llYXJseSIsIlNUUklQRV9FTlRFUlBSSVNFX1lFQVJMWV9QUklDRV9JRCIsImdldFByaWNlSWQiLCJwbGFuIiwiYmlsbGluZ0N5Y2xlIiwia2V5Il0sImlnbm9yZUxpc3QiOltdLCJzb3VyY2VSb290IjoiIn0=\n//# sourceURL=webpack-internal:///(rsc)/./src/lib/stripe.ts\n");

/***/ }),

/***/ "(ssr)/../../node_modules/next/dist/build/webpack/loaders/next-flight-client-entry-loader.js?server=true!":
/*!**********************************************************************************************************!*\
  !*** ../../node_modules/next/dist/build/webpack/loaders/next-flight-client-entry-loader.js?server=true! ***!
  \**********************************************************************************************************/
/***/ (() => {



/***/ }),

/***/ "../app-render/after-task-async-storage.external":
/*!***********************************************************************************!*\
  !*** external "next/dist/server/app-render/after-task-async-storage.external.js" ***!
  \***********************************************************************************/
/***/ ((module) => {

"use strict";
module.exports = require("next/dist/server/app-render/after-task-async-storage.external.js");

/***/ }),

/***/ "../app-render/work-async-storage.external":
/*!*****************************************************************************!*\
  !*** external "next/dist/server/app-render/work-async-storage.external.js" ***!
  \*****************************************************************************/
/***/ ((module) => {

"use strict";
module.exports = require("next/dist/server/app-render/work-async-storage.external.js");

/***/ }),

/***/ "./work-unit-async-storage.external":
/*!**********************************************************************************!*\
  !*** external "next/dist/server/app-render/work-unit-async-storage.external.js" ***!
  \**********************************************************************************/
/***/ ((module) => {

"use strict";
module.exports = require("next/dist/server/app-render/work-unit-async-storage.external.js");

/***/ }),

/***/ "?3713":
/*!****************************!*\
  !*** bufferutil (ignored) ***!
  \****************************/
/***/ (() => {

/* (ignored) */

/***/ }),

/***/ "?8e41":
/*!********************************!*\
  !*** utf-8-validate (ignored) ***!
  \********************************/
/***/ (() => {

/* (ignored) */

/***/ }),

/***/ "buffer":
/*!*************************!*\
  !*** external "buffer" ***!
  \*************************/
/***/ ((module) => {

"use strict";
module.exports = require("buffer");

/***/ }),

/***/ "child_process":
/*!********************************!*\
  !*** external "child_process" ***!
  \********************************/
/***/ ((module) => {

"use strict";
module.exports = require("child_process");

/***/ }),

/***/ "crypto":
/*!*************************!*\
  !*** external "crypto" ***!
  \*************************/
/***/ ((module) => {

"use strict";
module.exports = require("crypto");

/***/ }),

/***/ "events":
/*!*************************!*\
  !*** external "events" ***!
  \*************************/
/***/ ((module) => {

"use strict";
module.exports = require("events");

/***/ }),

/***/ "http":
/*!***********************!*\
  !*** external "http" ***!
  \***********************/
/***/ ((module) => {

"use strict";
module.exports = require("http");

/***/ }),

/***/ "https":
/*!************************!*\
  !*** external "https" ***!
  \************************/
/***/ ((module) => {

"use strict";
module.exports = require("https");

/***/ }),

/***/ "net":
/*!**********************!*\
  !*** external "net" ***!
  \**********************/
/***/ ((module) => {

"use strict";
module.exports = require("net");

/***/ }),

/***/ "next/dist/compiled/next-server/app-page.runtime.dev.js":
/*!*************************************************************************!*\
  !*** external "next/dist/compiled/next-server/app-page.runtime.dev.js" ***!
  \*************************************************************************/
/***/ ((module) => {

"use strict";
module.exports = require("next/dist/compiled/next-server/app-page.runtime.dev.js");

/***/ }),

/***/ "next/dist/compiled/next-server/app-route.runtime.dev.js":
/*!**************************************************************************!*\
  !*** external "next/dist/compiled/next-server/app-route.runtime.dev.js" ***!
  \**************************************************************************/
/***/ ((module) => {

"use strict";
module.exports = require("next/dist/compiled/next-server/app-route.runtime.dev.js");

/***/ }),

/***/ "punycode":
/*!***************************!*\
  !*** external "punycode" ***!
  \***************************/
/***/ ((module) => {

"use strict";
module.exports = require("punycode");

/***/ }),

/***/ "stream":
/*!*************************!*\
  !*** external "stream" ***!
  \*************************/
/***/ ((module) => {

"use strict";
module.exports = require("stream");

/***/ }),

/***/ "tls":
/*!**********************!*\
  !*** external "tls" ***!
  \**********************/
/***/ ((module) => {

"use strict";
module.exports = require("tls");

/***/ }),

/***/ "url":
/*!**********************!*\
  !*** external "url" ***!
  \**********************/
/***/ ((module) => {

"use strict";
module.exports = require("url");

/***/ }),

/***/ "util":
/*!***********************!*\
  !*** external "util" ***!
  \***********************/
/***/ ((module) => {

"use strict";
module.exports = require("util");

/***/ }),

/***/ "zlib":
/*!***********************!*\
  !*** external "zlib" ***!
  \***********************/
/***/ ((module) => {

"use strict";
module.exports = require("zlib");

/***/ })

};
;

// load runtime
var __webpack_require__ = require("../../../../webpack-runtime.js");
__webpack_require__.C(exports);
var __webpack_exec__ = (moduleId) => (__webpack_require__(__webpack_require__.s = moduleId))
var __webpack_exports__ = __webpack_require__.X(0, ["vendor-chunks/@supabase","vendor-chunks/next","vendor-chunks/tr46","vendor-chunks/stripe","vendor-chunks/ws","vendor-chunks/whatwg-url","vendor-chunks/qs","vendor-chunks/object-inspect","vendor-chunks/get-intrinsic","vendor-chunks/set-cookie-parser","vendor-chunks/webidl-conversions","vendor-chunks/side-channel-list","vendor-chunks/jose","vendor-chunks/side-channel-weakmap","vendor-chunks/has-symbols","vendor-chunks/function-bind","vendor-chunks/side-channel-map","vendor-chunks/side-channel","vendor-chunks/get-proto","vendor-chunks/call-bind-apply-helpers","vendor-chunks/dunder-proto","vendor-chunks/isows","vendor-chunks/math-intrinsics","vendor-chunks/call-bound","vendor-chunks/es-errors","vendor-chunks/gopd","vendor-chunks/es-define-property","vendor-chunks/hasown","vendor-chunks/es-object-atoms"], () => (__webpack_exec__("(rsc)/../../node_modules/next/dist/build/webpack/loaders/next-app-loader/index.js?name=app%2Fapi%2Fstripe%2Fcreate-checkout-session%2Froute&page=%2Fapi%2Fstripe%2Fcreate-checkout-session%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Fstripe%2Fcreate-checkout-session%2Froute.ts&appDir=C%3A%5CUsers%5Civone%5COneDrive%5CDocuments%5Csoundbridge%5Capps%5Cweb%5Capp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=C%3A%5CUsers%5Civone%5COneDrive%5CDocuments%5Csoundbridge%5Capps%5Cweb&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D!")));
module.exports = __webpack_exports__;

})();