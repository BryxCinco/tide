import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { Pressable } from '../ui/SoundPressable';

import { useThemeColors } from '../../hooks/useThemeColors';
import { ICON_OPTIONS, PRESET_COLORS } from '../../mocks/mockActivities';
import { useActivityStore } from '../../store/activityStore';
import type { Activity, DayCode, RecurrenceType } from '../../types/activity';
import { DAY_CODE_LABELS, DAY_CODE_ORDER } from '../../utils/activityRecurrence';
import { cn } from '../../utils/cn';
import { confirmAsync } from '../../utils/confirm';
import { formatDateKeyShort, toDateKey } from '../../utils/formatDate';
import { colors } from '../../utils/theme';
import { Button, CalendarPicker, ConfirmationModal, Icon, Input, Modal, Text, type IconName } from '../ui';

const RECURRENCE_OPTIONS: { value: RecurrenceType; label: string }[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'custom', label: 'Custom' },
];

export interface ActivityFormModalProps {
  visible: boolean;
  onClose: () => void;
  /** Present when editing; absent when creating a new activity. */
  activity?: Activity;
  /** Called with the created/updated activity right before the modal closes. */
  onSaved?: (activity: Activity) => void;
  /** False from the Timer's "+ Custom" chip — that flow already auto-selects the new
   * activity for the session about to start (onSaved), so a "Created! Start Session?"
   * confirmation on top of that would just be redundant. Defaults to true for every other
   * call site (the Activity Manager screen). */
  showSuccessModal?: boolean;
}

/** Shared by the Activity Manager screen and the Timer's "+ Custom" chip. */
export function ActivityFormModal({ visible, onClose, activity, onSaved, showSuccessModal = true }: ActivityFormModalProps) {
  const addActivity = useActivityStore((s) => s.addActivity);
  const updateActivity = useActivityStore((s) => s.updateActivity);
  const deleteActivity = useActivityStore((s) => s.deleteActivity);
  const setArchived = useActivityStore((s) => s.setArchived);
  const themeColors = useThemeColors();

  const [name, setName] = useState('');
  const [icon, setIcon] = useState(ICON_OPTIONS[0]);
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [recurrenceType, setRecurrenceType] = useState<RecurrenceType>('none');
  const [recurrenceDays, setRecurrenceDays] = useState<DayCode[]>([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState<string | null>(null);
  const [startCalendarVisible, setStartCalendarVisible] = useState(false);
  const [endCalendarVisible, setEndCalendarVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdActivity, setCreatedActivity] = useState<Activity | null>(null);
  const todayKey = useMemo(() => toDateKey(new Date()), []);

  const resetForm = () => {
    setName(activity?.name ?? '');
    setIcon(activity?.icon ?? ICON_OPTIONS[0]);
    setColor(activity?.color ?? PRESET_COLORS[0]);
    setRecurrenceType(activity?.recurrenceType ?? 'none');
    setRecurrenceDays(activity?.recurrenceDays ?? []);
    setStartDate(activity?.startDate ?? todayKey);
    setEndDate(activity?.endDate ?? null);
    setError(null);
  };

  const toggleRecurrenceDay = (day: DayCode) => {
    setRecurrenceDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]));
  };

  useEffect(() => {
    if (!visible) return;
    resetForm();
    setCreatedActivity(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, activity]);

  const isEditing = Boolean(activity);
  const canDelete = isEditing && activity?.category === 'custom';

  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Give this activity a name.');
      return;
    }

    const recurrence = { recurrenceType, recurrenceDays: recurrenceType === 'custom' ? recurrenceDays : [], startDate, endDate };

    if (activity) {
      updateActivity(activity.id, { name: trimmed, icon, color, ...recurrence });
      onSaved?.({ ...activity, name: trimmed, icon, color, ...recurrence });
      onClose();
      return;
    }

    setIsSaving(true);
    try {
      const created = await addActivity({ name: trimmed, icon, color, ...recurrence });
      onSaved?.(created);
      if (showSuccessModal) {
        setCreatedActivity(created);
      } else {
        onClose();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save this activity. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleArchive = () => {
    if (!activity) return;
    setArchived(activity.id, !activity.isArchived);
    onClose();
  };

  const handleDelete = async () => {
    if (!activity) return;
    const confirmed = await confirmAsync('Delete activity?', `"${activity.name}" will be removed. This can't be undone.`);
    if (!confirmed) return;
    deleteActivity(activity.id);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      onClose={onClose}
      title={isEditing ? 'Edit Activity' : 'New Activity'}
      icon="Layers"
      size="md"
      footer={
        <View className="gap-2">
          <Button title="Save" variant="primary" size="lg" fullWidth loading={isSaving} onPress={handleSave} />
          {isEditing && (
            <Button
              title={activity?.isArchived ? 'Unarchive Activity' : 'Archive Activity'}
              variant="ghost"
              size="md"
              fullWidth
              onPress={handleToggleArchive}
            />
          )}
          {canDelete && <Button title="Delete Activity" variant="danger" size="md" fullWidth onPress={handleDelete} />}
        </View>
      }
    >
      <View className="gap-6">
          <Input
            label="Name"
            placeholder="e.g. Reading"
            value={name}
            onChangeText={(text) => {
              setName(text);
              if (error) setError(null);
            }}
            error={error ?? undefined}
          />

          <View className="gap-2">
            <Text variant="label" color="muted">
              Icon
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {ICON_OPTIONS.map((option) => {
                const isSelected = option === icon;
                return (
                  <Pressable
                    key={option}
                    onPress={() => setIcon(option)}
                    className={cn(
                      'h-11 w-11 items-center justify-center rounded-full border-2 transition-transform duration-150 hover:scale-110',
                      isSelected ? 'border-tide-teal bg-tide-teal/10' : 'border-subtle bg-surface hover:border-default',
                    )}
                  >
                    <Icon name={option as IconName} size={19} color={isSelected ? color : undefined} />
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View className="gap-2">
            <Text variant="label" color="muted">
              Color
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {PRESET_COLORS.map((option) => {
                const isSelected = option === color;
                return (
                  <Pressable
                    key={option}
                    onPress={() => setColor(option)}
                    className="h-10 w-10 items-center justify-center rounded-full transition-transform duration-150 hover:scale-110"
                    style={{
                      backgroundColor: option,
                      borderWidth: isSelected ? 2 : 0,
                      borderColor: colors.brand.tideTeal,
                    }}
                  >
                    {isSelected && <Icon name="Check" size={16} color={colors.text.inverse} />}
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View className="gap-2">
            <Text variant="label" color="muted">
              Recurrence
            </Text>
            <View className="flex-row gap-2">
              <Pressable
                onPress={() => setRecurrenceType('none')}
                className={cn(
                  'flex-1 items-center rounded-full border-2 py-2.5',
                  recurrenceType === 'none' ? 'border-tide-teal bg-tide-teal/10' : 'border-subtle bg-base hover:border-default',
                )}
              >
                <Text variant="body" color={recurrenceType === 'none' ? 'accent' : 'secondary'} className={cn('normal-case tracking-normal', recurrenceType === 'none' && 'font-semibold')}>
                  One-time
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setRecurrenceType((prev) => (prev === 'none' ? 'daily' : prev))}
                className={cn(
                  'flex-1 items-center rounded-full border-2 py-2.5',
                  recurrenceType !== 'none' ? 'border-tide-teal bg-tide-teal/10' : 'border-subtle bg-base hover:border-default',
                )}
              >
                <Text variant="body" color={recurrenceType !== 'none' ? 'accent' : 'secondary'} className={cn('normal-case tracking-normal', recurrenceType !== 'none' && 'font-semibold')}>
                  Recurring
                </Text>
              </Pressable>
            </View>

            {recurrenceType !== 'none' && (
              <>
                <View className="flex-row flex-wrap gap-2 pt-1">
                  {RECURRENCE_OPTIONS.map((option) => {
                    const selected = recurrenceType === option.value;
                    return (
                      <Pressable
                        key={option.value}
                        onPress={() => setRecurrenceType(option.value)}
                        className={cn(
                          'rounded-full border-2 px-4 py-2 transition-transform duration-150 hover:scale-[1.03]',
                          selected ? 'border-tide-teal bg-tide-teal/10' : 'border-subtle bg-base hover:border-default',
                        )}
                      >
                        <Text variant="body" color={selected ? 'accent' : 'secondary'} className={cn('normal-case tracking-normal', selected && 'font-semibold')}>
                          {option.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                {recurrenceType === 'custom' && (
                  <View className="flex-row flex-wrap gap-2 pt-1">
                    {DAY_CODE_ORDER.map((day) => {
                      const selected = recurrenceDays.includes(day);
                      return (
                        <Pressable
                          key={day}
                          onPress={() => toggleRecurrenceDay(day)}
                          className={cn(
                            'h-10 w-12 items-center justify-center rounded-xl border-2',
                            selected ? 'border-tide-teal bg-tide-teal/10' : 'border-subtle bg-base hover:border-default',
                          )}
                        >
                          <Text variant="caption" color={selected ? 'accent' : 'secondary'} className={cn('normal-case tracking-normal', selected && 'font-semibold')}>
                            {DAY_CODE_LABELS[day]}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                )}

                <View className="flex-row gap-2 pt-1">
                  <Pressable
                    onPress={() => setStartCalendarVisible(true)}
                    className="h-11 flex-1 flex-row items-center gap-2 rounded-xl border border-subtle bg-base px-3.5 hover:border-default"
                  >
                    <Icon name="Calendar" size={15} color={themeColors.brand.tideTeal} />
                    <Text variant="body" color="primary" className="normal-case tracking-normal" numberOfLines={1}>
                      {formatDateKeyShort(startDate)}
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setEndCalendarVisible(true)}
                    className="h-11 flex-1 flex-row items-center gap-2 rounded-xl border border-subtle bg-base px-3.5 hover:border-default"
                  >
                    <Icon name="Calendar" size={15} color={endDate ? themeColors.brand.tideTeal : themeColors.text.disabled} />
                    <Text variant="body" color={endDate ? 'primary' : 'muted'} className="flex-1 normal-case tracking-normal" numberOfLines={1}>
                      {endDate ? formatDateKeyShort(endDate) : 'No end date'}
                    </Text>
                    {endDate && (
                      <Pressable onPress={() => setEndDate(null)} hitSlop={8} className="h-5 w-5 items-center justify-center rounded-full hover:bg-elevated">
                        <Icon name="X" size={12} color={themeColors.text.muted} />
                      </Pressable>
                    )}
                  </Pressable>
                </View>
              </>
            )}
          </View>

      </View>

      <Modal visible={startCalendarVisible} onClose={() => setStartCalendarVisible(false)} title="Start Date" icon="Calendar" size="sm">
        <View className="items-center">
          <CalendarPicker
            value={startDate || undefined}
            maxDate={endDate || undefined}
            onChange={(key) => {
              setStartDate(key);
              setStartCalendarVisible(false);
            }}
          />
        </View>
      </Modal>

      <Modal visible={endCalendarVisible} onClose={() => setEndCalendarVisible(false)} title="End Date" icon="Calendar" size="sm">
        <View className="items-center gap-4">
          <CalendarPicker
            value={endDate || undefined}
            minDate={startDate || undefined}
            onChange={(key) => {
              setEndDate(key);
              setEndCalendarVisible(false);
            }}
          />
          {endDate && (
            <Button
              title="Clear end date"
              variant="ghost"
              size="sm"
              onPress={() => {
                setEndDate(null);
                setEndCalendarVisible(false);
              }}
            />
          )}
        </View>
      </Modal>

      <ConfirmationModal
        visible={Boolean(createdActivity)}
        onClose={onClose}
        variant="success"
        icon="CheckCircle"
        title="Activity Created!"
        message={`"${createdActivity?.name}" is now available in your picker.`}
        autoDismissMs={3000}
        primaryAction={{
          label: 'Start Session',
          onPress: () => {
            router.push('/timer');
            onClose();
          },
        }}
        secondaryAction={{
          label: 'Create Another',
          onPress: () => {
            setCreatedActivity(null);
            resetForm();
          },
        }}
        tertiaryAction={{ label: 'Done', onPress: onClose }}
      />
    </Modal>
  );
}
