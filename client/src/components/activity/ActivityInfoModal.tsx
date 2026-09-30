import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { sessionService } from '../../services/session.service';
import { useActivityStore } from '../../store/activityStore';
import { useTimerStore } from '../../store/timerStore';
import type { Activity } from '../../types/activity';
import { isGuestMode } from '../../utils/authFlags';
import { confirmAsync } from '../../utils/confirm';
import { hexToRgba } from '../../utils/color';
import { formatEntryDate } from '../../utils/formatDate';
import { formatDuration } from '../../utils/formatTime';
import { Badge, Button, Icon, Modal, Text, type IconName } from '../ui';

export interface ActivityInfoModalProps {
  visible: boolean;
  onClose: () => void;
  /** Present whenever `visible` is true — kept optional only so the modal can stay mounted
   * (and animate its close) for one tick after the caller clears the selected activity. */
  activity?: Activity;
  /** Opens the edit form for this activity — the ONLY path to editing from here; this modal
   * itself never mutates name/icon/color directly. */
  onEdit: (activity: Activity) => void;
}

interface ActivityStats {
  totalSeconds: number;
  sessionCount: number;
  lastSessionDate: string | null;
}

function StatRow({ icon, label, value }: { icon: IconName; label: string; value: string }) {
  return (
    <View className="flex-row items-center justify-between">
      <View className="flex-row items-center gap-2">
        <Icon name={icon} size={15} />
        <Text variant="body" color="secondary" className="normal-case tracking-normal">
          {label}
        </Text>
      </View>
      <Text variant="body" color="primary" className="font-medium normal-case tracking-normal">
        {value}
      </Text>
    </View>
  );
}

/**
 * View-only activity detail — what clicking an activity card opens now, instead of jumping
 * straight into edit mode. All-time session stats aren't tracked as columns anywhere (Activity.
 * totalTimeSpent is declared but never populated — see its own comment in types/activity.ts),
 * so this fetches every session via GET /api/sessions (no date filter = all-time) and
 * aggregates client-side, scoped to this one activity_id. Fine at this app's personal-use
 * scale; would need a real backend aggregate if session history ever got large.
 */
export function ActivityInfoModal({ visible, onClose, activity, onEdit }: ActivityInfoModalProps) {
  const deleteActivity = useActivityStore((s) => s.deleteActivity);
  const setArchived = useActivityStore((s) => s.setArchived);
  const setTimerActivity = useTimerStore((s) => s.setActivity);

  const [stats, setStats] = useState<ActivityStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(false);

  useEffect(() => {
    if (!visible || !activity) return;
    setStats(null);

    // Guests have no backend account/JWT — there are no server-side sessions to fetch at all.
    if (isGuestMode()) {
      setStats({ totalSeconds: 0, sessionCount: 0, lastSessionDate: null });
      return;
    }

    let cancelled = false;
    setIsLoadingStats(true);
    sessionService
      .list()
      .then((rows) => {
        if (cancelled) return;
        const matching = rows.filter((row) => row.activity_id === activity.id);
        const totalSeconds = matching.reduce((sum, row) => sum + row.duration_seconds, 0);
        const lastSessionDate = matching.reduce<string | null>(
          (latest, row) => (!latest || row.ended_at > latest ? row.ended_at : latest),
          null,
        );
        setStats({ totalSeconds, sessionCount: matching.length, lastSessionDate });
      })
      .catch(() => {
        if (!cancelled) setStats({ totalSeconds: 0, sessionCount: 0, lastSessionDate: null });
      })
      .finally(() => {
        if (!cancelled) setIsLoadingStats(false);
      });

    return () => {
      cancelled = true;
    };
  }, [visible, activity]);

  if (!activity) return null;

  const isCustom = activity.category === 'custom';
  const averageSeconds = stats && stats.sessionCount > 0 ? Math.round(stats.totalSeconds / stats.sessionCount) : 0;
  const statValue = (value: string) => (isLoadingStats ? '…' : value);

  const handleStartSession = () => {
    setTimerActivity(activity);
    onClose();
    router.push('/timer');
  };

  const handleDelete = async () => {
    const confirmed = await confirmAsync(
      'Delete activity?',
      `"${activity.name}" will be removed. Past sessions logged under it keep their record.`,
    );
    if (!confirmed) return;
    deleteActivity(activity.id);
    onClose();
  };

  const handleToggleHide = () => {
    setArchived(activity.id, !activity.isArchived);
    onClose();
  };

  return (
    <Modal visible={visible} onClose={onClose} title={activity.name} icon={activity.icon as IconName} size="sm">
      <View className="gap-5">
        <View className="items-center gap-3 py-1">
          <View
            className="h-16 w-16 items-center justify-center rounded-full"
            style={{ backgroundColor: hexToRgba(activity.color, 0.12) }}
          >
            <Icon name={activity.icon as IconName} size={28} color={activity.color} />
          </View>
          <View className="flex-row flex-wrap items-center justify-center gap-2">
            {isCustom && <Badge label="Custom" variant="default" size="sm" />}
            {activity.isArchived && <Badge label="Archived" variant="warning" size="sm" />}
          </View>
        </View>

        <View className="gap-3 rounded-xl border border-subtle bg-base p-4">
          <StatRow icon="Clock" label="Total time tracked" value={statValue(formatDuration(stats?.totalSeconds ?? 0))} />
          <StatRow icon="ListChecks" label="Sessions" value={statValue(String(stats?.sessionCount ?? 0))} />
          <StatRow icon="BarChart2" label="Average session" value={statValue(formatDuration(averageSeconds))} />
          <StatRow
            icon="CalendarClock"
            label="Last session"
            value={statValue(stats?.lastSessionDate ? formatEntryDate(stats.lastSessionDate) : 'Never')}
          />
          <StatRow icon="CalendarPlus" label="Created" value={formatEntryDate(activity.createdAt)} />
          <StatRow icon="Star" label="Favorite" value={activity.isFavorite ? 'Yes' : 'No'} />
        </View>

        <View className="gap-2">
          <Button title="Start Session" variant="primary" size="lg" fullWidth icon="Play" onPress={handleStartSession} />
          <Button title="Edit" variant="secondary" size="md" fullWidth icon="Pencil" onPress={() => onEdit(activity)} />
          <View className="items-center pt-1">
            {isCustom ? (
              <Button title="Delete Activity" variant="ghost" size="sm" icon="Trash2" onPress={handleDelete} />
            ) : (
              <Button
                title={activity.isArchived ? 'Unhide Activity' : 'Hide Activity'}
                variant="ghost"
                size="sm"
                icon={activity.isArchived ? 'Eye' : 'EyeOff'}
                onPress={handleToggleHide}
              />
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}
