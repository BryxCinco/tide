import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, useWindowDimensions, View } from 'react-native';
import { Pressable } from '../ui/SoundPressable';

import { ICON_OPTIONS, PRESET_COLORS } from '../../mocks/mockActivities';
import { useActivityStore } from '../../store/activityStore';
import type { Activity } from '../../types/activity';
import { cn } from '../../utils/cn';
import { confirmAsync } from '../../utils/confirm';
import { colors } from '../../utils/theme';
import { Button, ConfirmationModal, Icon, Input, Modal, Text, type IconName } from '../ui';

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
  const { height } = useWindowDimensions();

  const [name, setName] = useState('');
  const [icon, setIcon] = useState(ICON_OPTIONS[0]);
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [error, setError] = useState<string | null>(null);
  const [createdActivity, setCreatedActivity] = useState<Activity | null>(null);

  const resetForm = () => {
    setName(activity?.name ?? '');
    setIcon(activity?.icon ?? ICON_OPTIONS[0]);
    setColor(activity?.color ?? PRESET_COLORS[0]);
    setError(null);
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

    if (activity) {
      updateActivity(activity.id, { name: trimmed, icon, color });
      onSaved?.({ ...activity, name: trimmed, icon, color });
      onClose();
      return;
    }

    setIsSaving(true);
    try {
      const created = await addActivity({ name: trimmed, icon, color });
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
    <Modal visible={visible} onClose={onClose} title={isEditing ? 'Edit Activity' : 'New Activity'} icon="Layers" size="md">
      <ScrollView style={{ maxHeight: height * 0.6 }} showsVerticalScrollIndicator={false}>
        <View className="gap-6 pb-1">
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
      </ScrollView>

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
