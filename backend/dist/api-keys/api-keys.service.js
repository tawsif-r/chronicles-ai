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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiKeysService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const crypto = __importStar(require("crypto"));
const api_key_entity_1 = require("./api-key.entity");
const ALGORITHM = 'aes-256-gcm';
let ApiKeysService = class ApiKeysService {
    constructor(repo, cfg) {
        this.repo = repo;
        this.cfg = cfg;
        const secret = cfg.getOrThrow('API_KEY_ENCRYPTION_SECRET');
        // Derive a 32-byte key from the secret
        this.encryptionKey = crypto.scryptSync(secret, 'chronicles-salt', 32);
    }
    async store(workspaceId, provider, plaintext) {
        // Upsert: one key per provider per workspace
        const existing = await this.repo.findOne({
            where: { workspace: { id: workspaceId }, provider },
        });
        const encryptedKey = this.encrypt(plaintext);
        if (existing) {
            existing.encryptedKey = encryptedKey;
            return this.repo.save(existing);
        }
        return this.repo.save(this.repo.create({
            workspace: { id: workspaceId },
            provider,
            encryptedKey,
        }));
    }
    async listForWorkspace(workspaceId) {
        const keys = await this.repo.find({
            where: { workspace: { id: workspaceId } },
        });
        return keys.map(({ encryptedKey: _k, ...safe }) => safe);
    }
    async remove(id, workspaceId) {
        const key = await this.repo.findOne({
            where: { id, workspace: { id: workspaceId } },
        });
        if (!key)
            throw new common_1.NotFoundException('API key not found');
        await this.repo.remove(key);
    }
    /** Returns env vars to inject into an agent process at start time. */
    async buildEnvForAgent(workspaceId) {
        const keys = await this.repo.find({
            where: { workspace: { id: workspaceId } },
        });
        const env = {};
        for (const k of keys) {
            const plain = this.decrypt(k.encryptedKey);
            if (k.provider === 'anthropic')
                env['ANTHROPIC_API_KEY'] = plain;
            if (k.provider === 'openai')
                env['OPENAI_API_KEY'] = plain;
        }
        return env;
    }
    encrypt(plaintext) {
        const iv = crypto.randomBytes(12);
        const cipher = crypto.createCipheriv(ALGORITHM, this.encryptionKey, iv);
        const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
        const tag = cipher.getAuthTag();
        return [iv.toString('hex'), tag.toString('hex'), encrypted.toString('hex')].join(':');
    }
    decrypt(stored) {
        const [ivHex, tagHex, encHex] = stored.split(':');
        const iv = Buffer.from(ivHex, 'hex');
        const tag = Buffer.from(tagHex, 'hex');
        const enc = Buffer.from(encHex, 'hex');
        const decipher = crypto.createDecipheriv(ALGORITHM, this.encryptionKey, iv);
        decipher.setAuthTag(tag);
        return decipher.update(enc).toString('utf8') + decipher.final('utf8');
    }
};
exports.ApiKeysService = ApiKeysService;
exports.ApiKeysService = ApiKeysService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(api_key_entity_1.ApiKey)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        config_1.ConfigService])
], ApiKeysService);
//# sourceMappingURL=api-keys.service.js.map