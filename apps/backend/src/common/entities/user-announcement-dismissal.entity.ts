import { Entity, PrimaryColumn, ManyToOne, JoinColumn, Column } from 'typeorm';
import { User } from './user.entity';
import { PlatformAnnouncement } from './platform-announcement.entity';

@Entity('user_announcement_dismissals')
export class UserAnnouncementDismissal {
  @PrimaryColumn({ type: 'uuid' })
  user_id: string;

  @PrimaryColumn({ type: 'uuid' })
  announcement_id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => PlatformAnnouncement, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'announcement_id' })
  announcement: PlatformAnnouncement;

  @Column({ type: 'timestamptz', default: () => 'now()' })
  dismissed_at: Date;
}
