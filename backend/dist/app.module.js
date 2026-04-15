"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const typeorm_1 = require("@nestjs/typeorm");
const bull_1 = require("@nestjs/bull");
const core_1 = require("@nestjs/core");
const auth_module_1 = require("./auth/auth.module");
const users_module_1 = require("./users/users.module");
const workspaces_module_1 = require("./workspaces/workspaces.module");
const agents_module_1 = require("./agents/agents.module");
const runtime_module_1 = require("./runtime/runtime.module");
const chat_module_1 = require("./chat/chat.module");
const logs_module_1 = require("./logs/logs.module");
const skills_module_1 = require("./skills/skills.module");
const api_keys_module_1 = require("./api-keys/api-keys.module");
const jwt_auth_guard_1 = require("./auth/jwt-auth.guard");
// Entities
const user_entity_1 = require("./users/user.entity");
const workspace_entity_1 = require("./workspaces/workspace.entity");
const agent_entity_1 = require("./agents/agent.entity");
const agent_channel_entity_1 = require("./agents/agent-channel.entity");
const chat_message_entity_1 = require("./chat/chat-message.entity");
const log_entity_1 = require("./logs/log.entity");
const skill_entity_1 = require("./skills/skill.entity");
const agent_skill_entity_1 = require("./skills/agent-skill.entity");
const api_key_entity_1 = require("./api-keys/api-key.entity");
const ALL_ENTITIES = [
    user_entity_1.User,
    workspace_entity_1.Workspace,
    agent_entity_1.Agent,
    agent_channel_entity_1.AgentChannel,
    chat_message_entity_1.ChatMessage,
    log_entity_1.AgentLog,
    skill_entity_1.Skill,
    agent_skill_entity_1.AgentSkill,
    api_key_entity_1.ApiKey,
];
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({ isGlobal: true }),
            typeorm_1.TypeOrmModule.forRootAsync({
                inject: [config_1.ConfigService],
                useFactory: (cfg) => ({
                    type: 'postgres',
                    url: cfg.getOrThrow('DATABASE_URL'),
                    entities: ALL_ENTITIES,
                    synchronize: process.env.NODE_ENV !== 'production',
                    logging: process.env.NODE_ENV === 'development',
                }),
            }),
            bull_1.BullModule.forRootAsync({
                inject: [config_1.ConfigService],
                useFactory: (cfg) => ({
                    redis: cfg.getOrThrow('REDIS_URL'),
                }),
            }),
            auth_module_1.AuthModule,
            users_module_1.UsersModule,
            workspaces_module_1.WorkspacesModule,
            agents_module_1.AgentsModule,
            runtime_module_1.RuntimeModule,
            chat_module_1.ChatModule,
            logs_module_1.LogsModule,
            skills_module_1.SkillsModule,
            api_keys_module_1.ApiKeysModule,
        ],
        providers: [
            // Apply JwtAuthGuard globally; routes opt out with @Public()
            { provide: core_1.APP_GUARD, useClass: jwt_auth_guard_1.JwtAuthGuard },
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map