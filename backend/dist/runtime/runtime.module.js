"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RuntimeModule = void 0;
const common_1 = require("@nestjs/common");
const runtime_service_1 = require("./runtime.service");
const agents_module_1 = require("../agents/agents.module");
const workspaces_module_1 = require("../workspaces/workspaces.module");
const api_keys_module_1 = require("../api-keys/api-keys.module");
const logs_module_1 = require("../logs/logs.module");
let RuntimeModule = class RuntimeModule {
};
exports.RuntimeModule = RuntimeModule;
exports.RuntimeModule = RuntimeModule = __decorate([
    (0, common_1.Module)({
        imports: [
            (0, common_1.forwardRef)(() => agents_module_1.AgentsModule),
            workspaces_module_1.WorkspacesModule,
            api_keys_module_1.ApiKeysModule,
            logs_module_1.LogsModule,
        ],
        providers: [runtime_service_1.RuntimeService],
        exports: [runtime_service_1.RuntimeService],
    })
], RuntimeModule);
//# sourceMappingURL=runtime.module.js.map