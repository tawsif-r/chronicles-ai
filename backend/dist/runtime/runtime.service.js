"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var RuntimeService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RuntimeService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const child_process_1 = require("child_process");
const agents_service_1 = require("../agents/agents.service");
const workspaces_service_1 = require("../workspaces/workspaces.service");
const api_keys_service_1 = require("../api-keys/api-keys.service");
const logs_service_1 = require("../logs/logs.service");
const path = __importStar(require("path"));
let RuntimeService = RuntimeService_1 = class RuntimeService {
    constructor(agentsService, workspacesService, apiKeysService, logsService, cfg) {
        this.agentsService = agentsService;
        this.workspacesService = workspacesService;
        this.apiKeysService = apiKeysService;
        this.logsService = logsService;
        this.cfg = cfg;
        this.logger = new common_1.Logger(RuntimeService_1.name);
        this.processes = new Map();
        this.usedPorts = new Set();
        this.portStart = parseInt(cfg.get('OPENCLAW_PORT_RANGE_START', '18800'));
        this.portEnd = parseInt(cfg.get('OPENCLAW_PORT_RANGE_END', '19800'));
        this.binary = cfg.get('OPENCLAW_BINARY', 'openclaw');
    }
    /** On restart: mark all previously-running agents as 'error' (ADR-001 option a). */
    async onApplicationBootstrap() {
        // TODO: query DB for status='running' agents and set them to 'error'
        this.logger.log('RuntimeService ready');
    }
    async start(agentId, workspaceId) {
        const agent = await this.agentsService.assertOwnership(agentId, workspaceId);
        if (agent.status === 'running') {
            throw new common_1.BadRequestException('Agent is already running');
        }
        const workspace = await this.workspacesService.findById(workspaceId);
        if (!workspace)
            throw new common_1.BadRequestException('Workspace not found');
        await this.agentsService.writeConfigFiles(agent, workspace);
        const port = this.acquirePort();
        await this.agentsService.updateStatus(agentId, 'starting', port);
        const agentDir = path.join(workspace.diskPath, 'agents', agentId);
        const apiKeyEnv = await this.apiKeysService.buildEnvForAgent(workspaceId);
        const proc = (0, child_process_1.spawn)(this.binary, ['start', '--port', String(port)], {
            cwd: agentDir,
            env: { ...process.env, ...apiKeyEnv },
        });
        this.processes.set(agentId, proc);
        proc.stdout?.on('data', (chunk) => {
            this.logsService.ingest(agentId, 'info', chunk.toString());
        });
        proc.stderr?.on('data', (chunk) => {
            this.logsService.ingest(agentId, 'error', chunk.toString());
        });
        proc.on('spawn', () => {
            this.agentsService.updateStatus(agentId, 'running', port);
            this.logger.log(`Agent ${agentId} started on port ${port}`);
        });
        proc.on('close', (code) => {
            this.usedPorts.delete(port);
            this.processes.delete(agentId);
            this.agentsService.updateStatus(agentId, code === 0 ? 'stopped' : 'error', null);
            this.logger.log(`Agent ${agentId} exited with code ${code}`);
        });
    }
    async stop(agentId, workspaceId) {
        // Ownership check (no-op if agent doesn't exist during delete)
        try {
            await this.agentsService.assertOwnership(agentId, workspaceId);
        }
        catch {
            return;
        }
        const proc = this.processes.get(agentId);
        if (proc) {
            proc.kill('SIGTERM');
            this.processes.delete(agentId);
        }
        await this.agentsService.updateStatus(agentId, 'stopped', null);
    }
    async restart(agentId, workspaceId) {
        await this.stop(agentId, workspaceId);
        await this.start(agentId, workspaceId);
    }
    getProcess(agentId) {
        return this.processes.get(agentId);
    }
    acquirePort() {
        for (let p = this.portStart; p <= this.portEnd; p++) {
            if (!this.usedPorts.has(p)) {
                this.usedPorts.add(p);
                return p;
            }
        }
        throw new Error('No free ports available in the pool');
    }
};
exports.RuntimeService = RuntimeService;
exports.RuntimeService = RuntimeService = RuntimeService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [agents_service_1.AgentsService,
        workspaces_service_1.WorkspacesService,
        api_keys_service_1.ApiKeysService,
        logs_service_1.LogsService,
        config_1.ConfigService])
], RuntimeService);
//# sourceMappingURL=runtime.service.js.map