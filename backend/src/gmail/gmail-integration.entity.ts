import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('gmail_integrations')
export class GmailIntegration {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  workspaceId: string;

  @Column()
  encryptedAccessToken: string;

  @Column()
  encryptedRefreshToken: string;

  @Column()
  email: string;

  @Column({ type: 'bigint' })
  expiresAt: number;
}
