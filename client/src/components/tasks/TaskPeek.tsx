import { useEffect, useRef } from 'react';
import { Animated, Easing, Modal as RNModal, Platform, Pressable as RNPressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useResponsive } from '../../hooks/useResponsive';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useActivityStore } from '../../store/activityStore';
import { useTaskStore } from '../../store/taskStore';
import { useThemeStore } from '../../store/themeStore';
import { darkVars, lightVars } from '../../utils/themeVars';
import type { Task } from '../../types/task';
import { Icon, Modal, Text } from '../ui';
import { Pressable } from '../ui/SoundPressable';
import { TaskForm } from './TaskFormModal';
import { TaskInfoModal } from './TaskInfoModal';

export interface TaskPeekProps {
  /** The task to open; undefined with `visible` means "create a new task". */
  task?: Task;
  visible: boolean;
  onClose: () => void;
}

/**
 * Notion-style "peek": the task opens in a side panel on tablet/desktop (the board stays
 * visible behind it) and in a sheet on phone. Done tasks are locked, so they open the
 * read-only details instead of the form.
 */
export function TaskPeek({ task, visible, onClose }: TaskPeekProps) {
  const { isPhone } = useResponsive();
  const theme = useThemeColors();
  const toggleTaskStatus = useTaskStore((s) => s.toggleTaskStatus);
  const deleteTask = useTaskStore((s) => s.deleteTask);
  const activities = useActivityStore((s) => s.activities);
  const opacity = useRef(new Animated.Value(0)).current;
  // RN Modal portals outside the app root, so the theme's CSS variables must be re-applied.
  const isDark = useThemeStore((st) => st.theme === 'dark');

  useEffect(() => {
    if (!visible) return;
    opacity.setValue(0);
    Animated.timing(opacity, { toValue: 1, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: Platform.OS !== 'web' }).start();
  }, [visible, opacity]);

  if (task?.status === 'done') {
    return (
      <TaskInfoModal
        visible={visible}
        onClose={onClose}
        task={task}
        activityName={activities.find((a) => a.id === task.linkedActivityId)?.name}
        onToggle={toggleTaskStatus}
        onDelete={(id) => {
          deleteTask(id);
          onClose();
        }}
        onEdit={() => undefined}
      />
    );
  }

  const form = <TaskForm task={task} active={visible} onClose={onClose} onSaved={onClose} />;

  if (isPhone) {
    return (
      <Modal visible={visible} onClose={onClose} title={task ? 'Task' : 'New task'} icon="SquareCheck" size="full">
        {form}
      </Modal>
    );
  }

  return (
    <RNModal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View style={[{ flex: 1, opacity }, isDark ? darkVars : lightVars]}>
        <RNPressable onPress={onClose} accessibilityLabel="Close task" style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(3, 20, 26, 0.28)' }} />
        <View
          className="absolute bottom-3 right-3 top-3 overflow-hidden rounded-3xl border"
          // Solid (not glass): a panel over busy content must stay readable.
          style={{ backgroundColor: theme.background.base, borderColor: theme.border.default, width: 460, maxWidth: '96%', shadowColor: '#03141A', shadowOpacity: 0.25, shadowRadius: 30, shadowOffset: { width: -8, height: 0 }, elevation: 12 }}
        >
          <SafeAreaView className="flex-1" edges={['top', 'bottom']}>
            <View className="flex-row items-center gap-2 border-b border-default px-4 py-3">
              <Icon name="PanelRightOpen" size={16} color={theme.text.muted} />
              <Text variant="body" color="muted" className="flex-1 text-[13px]">
                Tasks <Text variant="body" color="muted" className="text-[13px]">/</Text>{' '}
                <Text variant="body" color="secondary" className="text-[13px] font-medium">
                  {task ? task.title : 'New task'}
                </Text>
              </Text>
              <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" className="h-8 w-8 items-center justify-center rounded-lg hover:bg-[rgba(100,116,139,0.10)]">
                <Icon name="X" size={17} color={theme.text.secondary} />
              </Pressable>
            </View>
            <ScrollView className="thin-scrollbar flex-1" contentContainerClassName="p-5 pb-10" keyboardShouldPersistTaps="handled">
              {form}
            </ScrollView>
          </SafeAreaView>
        </View>
      </Animated.View>
    </RNModal>
  );
}
