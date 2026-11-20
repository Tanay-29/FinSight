/**
 * ProfileScreen
 *
 * Every row here does real work: preferences persist to Firestore, the export
 * writes an actual file, and deleting the account really deletes it.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, Switch, Alert, ActivityIndicator, Platform } from 'react-native';
import { Pressable } from '../components/Pressable';
import DateTimePicker from '@react-native-community/datetimepicker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { PressableScale } from '../components/PressableScale';
import { COLORS, TYPE, RADIUS, FACE, IS_IOS } from '../theme/tokens';
import { BackButton } from '../components/BackButton';
import { GroupedSection, GroupedRow, IconTile, Segmented } from '../components/GroupedList';
import { ProgressRing } from '../components/ProgressRing';
import { inr } from '../utils/moneyMath';
import { useScheme, type ThemePref } from '../theme/theme';
import Constants from 'expo-constants';
import {
    Bell, RefreshCw, Lock, Upload, Info,
    Trash2, Flame, ChevronRight, ArrowLeft, Moon, User, ClipboardCheck, Clock, LogOut,
} from 'lucide-react-native';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { logOutUser, updatePreferences, deleteUserAccount } from '../store/slices/authSlice';
import { liveStreak } from '../utils/streak';
import { fetchGoals } from '../store/slices/goalsSlice';
import { goalIcon } from '../theme/icons';
import { exportUserData } from '../services/exportService';
import { getReminderPreference, enableReminders, disableReminders, formatReminderTime, DEFAULT_REMINDER, ReminderPreference, ensurePermission } from '../services/reminderService';
import { selectSessionDoneToday } from '../store/slices/lessonsSlice';
import * as haptics from '../utils/haptics';

const SettingsRow: React.FC<{
    icon: React.ReactNode;
    label: string;
    hint?: string;
    onPress?: () => void;
    rightElement?: React.ReactNode;
    danger?: boolean;
    disabled?: boolean;
}> = ({ icon, label, hint, onPress, rightElement, danger, disabled }) => {
    const body = (
        <>
            <View className="w-8 h-8 rounded-lg bg-surface-secondary items-center justify-center mr-3">
                {icon}
            </View>
            <View className="flex-1">
                <Text className={`text-base ${danger ? 'text-loss' : 'text-text-primary'}`}>
                    {label}
                </Text>
                {hint ? <Text className="text-xs text-text-tertiary mt-0.5 font-inter ios:font-system">{hint}</Text> : null}
            </View>
            {rightElement ?? <ChevronRight size={16} color={COLORS.text.tertiary} />}
        </>
    );
    // A row whose control sits on the right (a switch, the theme picker) is
    // not itself a button. Wrapping it in a disabled Pressable blocked taps
    // on the control inside it.
    if (!onPress) {
        return <View className="flex-row items-center px-4 py-3.5 border-b border-border" style={{ opacity: disabled ? 0.5 : 1 }}>{body}</View>;
    }
    // A settings row marks press with its own background rather than scaling,
    // for the same reason a transaction row does.
    return (
        <Pressable
            className="flex-row items-center px-4 py-3.5 border-b border-border"
            onPress={() => { haptics.tap(); onPress(); }}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityLabel={label}
            style={({ pressed }) => ({
                opacity: disabled ? 0.5 : 1,
                backgroundColor: pressed ? COLORS.surface.secondary : 'transparent',
            })}
        >
            {body}
        </Pressable>
    );
};

export const ProfileScreen: React.FC = () => {
    const { pref, setPref, scheme } = useScheme();
    const navigation = useNavigation();
    const { user, profile } = useAppSelector((state) => state.auth);
    const goals = useAppSelector((state) => state.goals.items);
    const dispatch = useAppDispatch();

    const [exporting, setExporting] = useState(false);
    const [deleting, setDeleting] = useState(false);

    // Session reminder: a device setting, read from AsyncStorage.
    const sessionDoneToday = useAppSelector(selectSessionDoneToday);
    const [reminder, setReminder] = useState<ReminderPreference>(DEFAULT_REMINDER);
    const [timePickerOpen, setTimePickerOpen] = useState(false);
    useEffect(() => { getReminderPreference().then(setReminder); }, []);

    const toggleReminder = async (on: boolean) => {
        if (!on) {
            await disableReminders();
            setReminder((r) => ({ ...r, enabled: false }));
            return;
        }
        const ok = await enableReminders(reminder.hour, reminder.minute, sessionDoneToday);
        setReminder((r) => ({ ...r, enabled: ok }));
        if (!ok) {
            Alert.alert('Notifications are off', 'Allow notifications for FinSight in your phone settings to get a daily reminder.');
        }
    };

    const changeReminderTime = async (hour: number, minute: number) => {
        setReminder((r) => ({ ...r, hour, minute }));
        if (reminder.enabled) await enableReminders(hour, minute, sessionDoneToday);
    };

    const displayName = user?.displayName || profile?.name || 'Your profile';
    // A phone account has no email, so the line under the name shows whichever
    // identifier this account actually signs in with.
    const phone = user?.phoneNumber || profile?.phoneNumber || '';
    const contact = user?.email || profile?.email || phone;
    const provider = profile?.authProvider ?? (phone && !user?.email ? 'phone' : null);
    const signedInWith = provider === 'google' ? 'Signed in with Google'
        : provider === 'phone' ? 'Signed in with your phone number'
            : provider === 'password' ? 'Signed in with email and password'
                : null;
    const initial = displayName.charAt(0).toUpperCase();
    // The same lapsed-streak rule as Today, so the two never disagree.
    const streak = liveStreak(profile?.streak ?? 0, profile?.lastStudiedDate, profile?.streakFreezes ?? 0);

    // Preferences come from Firestore, defaulting to on for a fresh profile.
    const notificationsEnabled = profile?.preferences?.notifications ?? true;
    const autoTrackingEnabled = profile?.preferences?.autoTracking ?? true;

    useEffect(() => {
        // fetchGoals reads the uid from state itself.
        if (user?.uid) dispatch(fetchGoals());
    }, [dispatch, user?.uid]);

    /** The goal closest to completion that is not finished yet. */
    const primaryGoal = useMemo(() => {
        const open = goals.filter((g) => g.savedAmount < g.targetAmount);
        const pool = open.length > 0 ? open : goals;
        return [...pool].sort(
            (a, b) => b.savedAmount / b.targetAmount - a.savedAmount / a.targetAmount
        )[0];
    }, [goals]);

    const setPreference = (changes: { notifications?: boolean; autoTracking?: boolean }) => {
        if (!user?.uid) return;
        haptics.select();
        dispatch(updatePreferences({ uid: user.uid, changes }));
    };

    const handleExport = async () => {
        if (!user?.uid || exporting) return;
        setExporting(true);
        try {
            const result = await exportUserData(user.uid);
            if (!result.shared) {
                Alert.alert('Export saved', `Sharing is unavailable on this device. The file was written to:\n\n${result.uri}`);
            }
        } catch (error: any) {
            Alert.alert('Export failed', error?.message || 'Could not export your data. Please try again.');
        } finally {
            setExporting(false);
        }
    };

    const handleLogout = () => {
        Alert.alert('Sign out', 'Sign out of FinSight on this device?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Sign Out', style: 'destructive', onPress: () => dispatch(logOutUser()) },
        ]);
    };

    const handleDeleteAccount = () => {
        Alert.alert(
            'Delete Account',
            'This permanently deletes your profile, transactions, budgets, goals and learning progress. This cannot be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        setDeleting(true);
                        const result = await dispatch(deleteUserAccount());
                        setDeleting(false);
                        if (deleteUserAccount.rejected.match(result)) {
                            Alert.alert('Could not delete account', result.payload as string);
                        }
                    },
                },
            ]
        );
    };

    const appVersion = Constants.expoConfig?.version ?? '1.0.0';

    const handleAbout = () => {
        Alert.alert(
            'About FinSight',
            `Version ${appVersion}\n\nLearn money basics, track what you spend, and see the real cost before you buy.`
        );
    };

    const handlePrivacy = () => {
        Alert.alert(
            'Privacy and Data',
            'Your transactions, budgets and goals are stored in your own Firebase account and are readable only by you.\n\nTo write your score summary, a short summary of your recent spending is sent to our server. It is never saved to a database. Use Export your data to take a copy, or Delete account to remove everything.'
        );
    };

    if (IS_IOS) {
        const onAccent = COLORS.brand.onAccent;
        const tile = COLORS.brand.primaryDark;
        const toggleBudgetAlerts = async (v: boolean) => {
            setPreference({ notifications: v });
            // On by default for new accounts, but nothing can be delivered
            // until the phone has said yes.
            if (v && !(await ensurePermission())) {
                Alert.alert('Notifications are off', 'Allow notifications for FinSight in your phone settings to get budget alerts.');
            }
        };
        return (
            <SafeAreaView className="flex-1 bg-surface-secondary" edges={['top']}>
                <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 48 }}>
                    <View style={{ paddingHorizontal: 16, paddingTop: 6 }}>
                        <BackButton />
                        <Text accessibilityRole="header" style={{ ...TYPE.largeTitle, color: COLORS.text.primary, marginTop: 8, marginLeft: 4 }}>Profile</Text>
                    </View>

                    {/* The account, as the first row of Settings shows it. */}
                    <GroupedSection>
                        <Pressable
                            onPress={() => { haptics.tap(); navigation.navigate({ name: 'EditProfile', params: { edit: true } } as never); }}
                            accessibilityRole="button"
                            accessibilityLabel={`${displayName}, edit your details`}
                            style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: pressed ? COLORS.surface.tertiary : 'transparent' })}
                        >
                            <View style={{ width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.brand.primaryDark, marginRight: 14 }}>
                                <Text style={{ ...FACE.semibold, fontSize: 24, color: onAccent }}>{initial}</Text>
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text numberOfLines={1} style={{ ...FACE.semibold, fontSize: 20, lineHeight: 25, color: COLORS.text.primary }}>{displayName}</Text>
                                {contact ? <Text numberOfLines={1} style={{ ...FACE.regular, fontSize: 15, lineHeight: 20, color: COLORS.text.secondary }}>{contact}</Text> : null}
                                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 3 }}>
                                    <Flame size={12} color={streak > 0 ? COLORS.semantic.alertAmberFill : COLORS.text.tertiary} />
                                    <Text style={{ ...FACE.regular, fontSize: 13, lineHeight: 18, color: COLORS.text.secondary, marginLeft: 4, flexShrink: 1 }}>
                                        {streak > 0 ? `${streak} day streak` : 'No streak yet'}
                                    </Text>
                                </View>
                                {signedInWith ? <Text style={{ ...FACE.regular, fontSize: 13, lineHeight: 18, color: COLORS.text.tertiary }}>{signedInWith}</Text> : null}
                            </View>
                            <ChevronRight size={18} color={COLORS.text.muted} strokeWidth={2.4} />
                        </Pressable>
                        {primaryGoal ? (
                            <Pressable
                                onPress={() => { haptics.tap(); (navigation as any).navigate('MainTabs', { screen: 'Goals' }); }}
                                accessibilityRole="button"
                                accessibilityLabel={`Closest goal, ${primaryGoal.title}, open Goals`}
                                style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: pressed ? COLORS.surface.tertiary : 'transparent' })}
                            >
                                <ProgressRing value={primaryGoal.targetAmount > 0 ? primaryGoal.savedAmount / primaryGoal.targetAmount : 0} size={30} stroke={3.5} color={primaryGoal.color}>
                                    {React.createElement(goalIcon(primaryGoal.icon), { size: 13, color: primaryGoal.color })}
                                </ProgressRing>
                                <View style={{ flex: 1, marginLeft: 14 }}>
                                    <Text numberOfLines={1} style={{ ...FACE.regular, fontSize: 17, lineHeight: 22, color: COLORS.text.primary }}>{primaryGoal.title}</Text>
                                    <Text style={{ ...FACE.regular, fontSize: 13, lineHeight: 18, color: COLORS.text.secondary }}>
                                        Closest goal, ₹{inr(primaryGoal.savedAmount)} of ₹{inr(primaryGoal.targetAmount)}
                                    </Text>
                                </View>
                                <Text style={{ ...TYPE.amountSm, color: COLORS.text.secondary }}>
                                    {Math.round((primaryGoal.savedAmount / Math.max(1, primaryGoal.targetAmount)) * 100)}%
                                </Text>
                                <ChevronRight size={18} color={COLORS.text.muted} strokeWidth={2.4} style={{ marginLeft: 6 }} />
                            </Pressable>
                        ) : null}
                    </GroupedSection>

                    <GroupedSection header="Learning">
                        <GroupedRow
                            icon={<IconTile color={tile}><ClipboardCheck size={17} color={onAccent} /></IconTile>}
                            label="Money knowledge check"
                            hint={profile?.quizBaseline
                                ? `Started at ${profile.quizBaseline.score}/10${profile.quizLatest ? `, latest ${profile.quizLatest.score}/10` : ''}`
                                : 'Ten questions, two minutes'}
                            onPress={() => navigation.navigate('MoneyQuiz' as never)}
                        />
                    </GroupedSection>

                    <GroupedSection header="Preferences" footer="Budget alerts arrive at 80% and again at 100% of a category's limit.">
                        <GroupedRow
                            icon={<IconTile color={tile}><Moon size={17} color={onAccent} /></IconTile>}
                            label="Appearance"
                            accessory={
                                <Segmented
                                    label="Appearance"
                                    value={pref}
                                    onChange={setPref}
                                    options={[{ value: 'system', label: 'Auto' }, { value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }]}
                                />
                            }
                        />
                        <GroupedRow
                            icon={<IconTile color={tile}><Bell size={17} color={onAccent} /></IconTile>}
                            label="Daily session reminder"
                            accessory={
                                <Switch
                                    value={reminder.enabled}
                                    onValueChange={(v) => { haptics.select(); toggleReminder(v); }}
                                    trackColor={{ false: COLORS.surface.tertiary, true: COLORS.brand.primary }}
                                    accessibilityLabel="Daily session reminder"
                                />
                            }
                        />
                        {reminder.enabled ? (
                            <GroupedRow
                                icon={<IconTile color={tile}><Clock size={17} color={onAccent} /></IconTile>}
                                label="Reminder time"
                                accessory={
                                    <DateTimePicker
                                        value={new Date(2000, 0, 1, reminder.hour, reminder.minute)}
                                        mode="time"
                                        display="compact"
                                        accentColor={COLORS.brand.primary}
                                        themeVariant={scheme}
                                        onChange={(event, picked) => {
                                            if (event.type === 'dismissed' || !picked) return;
                                            changeReminderTime(picked.getHours(), picked.getMinutes());
                                        }}
                                    />
                                }
                            />
                        ) : null}
                        <GroupedRow
                            icon={<IconTile color={tile}><Bell size={17} color={onAccent} /></IconTile>}
                            label="Budget alerts"
                            accessory={
                                <Switch
                                    value={notificationsEnabled}
                                    onValueChange={toggleBudgetAlerts}
                                    trackColor={{ false: COLORS.surface.tertiary, true: COLORS.brand.primary }}
                                    accessibilityLabel="Budget alerts"
                                />
                            }
                        />
                        <GroupedRow
                            icon={<IconTile color={tile}><RefreshCw size={17} color={onAccent} /></IconTile>}
                            label="Read pasted bank messages"
                            hint="Fills in the amount and category from a pasted bank SMS"
                            accessory={
                                <Switch
                                    value={autoTrackingEnabled}
                                    onValueChange={(v) => setPreference({ autoTracking: v })}
                                    trackColor={{ false: COLORS.surface.tertiary, true: COLORS.brand.primary }}
                                    accessibilityLabel="Read pasted bank messages"
                                />
                            }
                        />
                    </GroupedSection>

                    <GroupedSection header="Your data">
                        <GroupedRow
                            icon={<IconTile color={tile}><Lock size={17} color={onAccent} /></IconTile>}
                            label="Privacy and data"
                            onPress={handlePrivacy}
                        />
                        <GroupedRow
                            icon={<IconTile color={tile}><Upload size={17} color={onAccent} /></IconTile>}
                            label="Export your data"
                            onPress={handleExport}
                            disabled={exporting}
                            accessory={exporting ? <ActivityIndicator size="small" color={COLORS.text.secondary} /> : undefined}
                        />
                        <GroupedRow
                            icon={<IconTile color={tile}><Info size={17} color={onAccent} /></IconTile>}
                            label="About FinSight"
                            onPress={handleAbout}
                        />
                    </GroupedSection>

                    <GroupedSection>
                        <GroupedRow
                            icon={<IconTile color={COLORS.semantic.loss}><LogOut size={17} color={onAccent} /></IconTile>}
                            label="Sign out"
                            destructive
                            onPress={handleLogout}
                        />
                        <GroupedRow
                            icon={<IconTile color={COLORS.semantic.loss}><Trash2 size={17} color={onAccent} /></IconTile>}
                            label="Delete account"
                            destructive
                            onPress={handleDeleteAccount}
                            disabled={deleting}
                            accessory={deleting ? <ActivityIndicator size="small" color={COLORS.semantic.loss} /> : undefined}
                        />
                    </GroupedSection>

                    <Text style={{ ...FACE.regular, fontSize: 13, lineHeight: 18, color: COLORS.text.secondary, textAlign: 'center', marginTop: 24 }}>
                        FinSight {appVersion}
                    </Text>
                </ScrollView>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView className="flex-1 bg-surface-secondary" edges={['top']}>
            <ScrollView
                className="flex-1"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 80 }}
            >
                <View className="px-5 pt-4 pb-2 flex-row items-center">
                    <Pressable
                        onPress={() => navigation.goBack()}
                        hitSlop={10}
                        accessibilityRole="button"
                        accessibilityLabel="Back"
                        style={{ width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.surface.primary, borderWidth: 1, borderColor: COLORS.border.default, marginRight: 12 }}
                    >
                        <ArrowLeft size={18} color={COLORS.text.primary} />
                    </Pressable>
                    <Text style={TYPE.heading} className="text-text-primary">Profile</Text>
                </View>

                {/* User Card */}
                <View className="mx-5 mt-3 bg-surface-primary border border-border rounded-2xl p-4">
                    <View className="flex-row items-center">
                        <View className="w-16 h-16 rounded-full bg-brand-primary-dark items-center justify-center mr-4">
                            <Text className="text-2xl text-white font-inter-bold ios:font-system ios:font-bold">{initial}</Text>
                        </View>
                        <View className="flex-1">
                            <Text className="text-xl font-inter-bold ios:font-system ios:font-bold text-text-primary">{displayName}</Text>
                            {contact ? <Text className="text-sm text-text-secondary font-inter ios:font-system">{contact}</Text> : null}
                            {signedInWith ? <Text className="text-xs text-text-tertiary font-inter ios:font-system mt-0.5">{signedInWith}</Text> : null}
                            <View className="flex-row items-center mt-1.5">
                                <View className="bg-brand-primary/10 rounded-full px-3 py-1 flex-row items-center">
                                    <Flame size={11} color={COLORS.brand.primary} />
                                    <Text className="text-xs font-inter-semibold ios:font-system ios:font-semibold text-brand-primary ml-1">
                                        {streak > 0 ? `${streak} day streak` : 'No streak yet'}
                                    </Text>
                                </View>
                            </View>
                        </View>
                    </View>
                </View>

                {/* The goal closest to done, as it looks on the Goals tab. */}
                {primaryGoal ? (
                    <Pressable
                        onPress={() => (navigation as any).navigate('MainTabs', { screen: 'Goals' })}
                        accessibilityRole="button"
                        accessibilityLabel={`${primaryGoal.title}, open Goals`}
                        className="mx-5 mt-3 bg-surface-primary border border-border p-4 flex-row items-center"
                        style={{ borderRadius: RADIUS.card }}
                    >
                        <ProgressRing value={primaryGoal.targetAmount > 0 ? primaryGoal.savedAmount / primaryGoal.targetAmount : 0} size={52} stroke={5} color={primaryGoal.color}>
                            {React.createElement(goalIcon(primaryGoal.icon), { size: 20, color: primaryGoal.color })}
                        </ProgressRing>
                        <View className="flex-1 ml-3.5">
                            <Text style={TYPE.micro} className="text-text-tertiary">Closest goal</Text>
                            <Text style={[TYPE.callout, { ...FACE.semibold }]} className="text-text-primary mt-0.5" numberOfLines={1}>{primaryGoal.title}</Text>
                            <Text style={TYPE.caption} className="text-text-secondary">
                                ₹{inr(primaryGoal.savedAmount)} of ₹{inr(primaryGoal.targetAmount)}
                            </Text>
                        </View>
                        <Text style={[TYPE.amountMd, { color: primaryGoal.color }]}>
                            {Math.round((primaryGoal.savedAmount / Math.max(1, primaryGoal.targetAmount)) * 100)}%
                        </Text>
                        <ChevronRight size={16} color={COLORS.text.tertiary} style={{ marginLeft: 6 }} />
                    </Pressable>
                ) : null}

                {/* Settings */}
                <View className="mx-5 mt-4 bg-surface-primary border border-border rounded-2xl overflow-hidden">
                    <View className="px-4 py-3 border-b border-border">
                        <Text className="text-lg font-inter-semibold ios:font-system ios:font-semibold text-text-primary">Settings</Text>
                    </View>

                    <SettingsRow
                        icon={<User size={16} color={COLORS.text.secondary} />}
                        label="Your details"
                        hint="Name, age, goals and income"
                        onPress={() => navigation.navigate({ name: 'EditProfile', params: { edit: true } } as never)}
                    />
                    <SettingsRow
                        icon={<ClipboardCheck size={16} color={COLORS.text.secondary} />}
                        label="Money knowledge check"
                        hint={profile?.quizBaseline
                            ? `Started at ${profile.quizBaseline.score}/10${profile.quizLatest ? `, latest ${profile.quizLatest.score}/10` : ''}`
                            : 'Ten questions, two minutes'}
                        onPress={() => navigation.navigate('MoneyQuiz' as never)}
                    />
                    {/* Appearance leads the rest because it changes the whole
                        app, where the rows under it each change one feature. */}
                    <SettingsRow
                        icon={<Moon size={16} color={COLORS.text.secondary} />}
                        label="Appearance"
                        hint={
                            pref === 'system'
                                ? 'Following your phone'
                                : pref === 'dark' ? 'Always dark' : 'Always light'
                        }
                        rightElement={
                            <View
                                className="flex-row bg-surface-tertiary p-1"
                                style={{ borderRadius: RADIUS.control }}
                            >
                                {(['system', 'light', 'dark'] as ThemePref[]).map((opt) => (
                                    <Pressable
                                        key={opt}
                                        onPress={() => { haptics.tap(); setPref(opt); }}
                                        accessibilityRole="button"
                                        accessibilityState={{ selected: pref === opt }}
                                        accessibilityLabel={`Appearance, ${opt}`}
                                        className="px-2.5 py-1.5"
                                        style={{
                                            borderRadius: RADIUS.chip,
                                            backgroundColor: pref === opt
                                                ? COLORS.surface.primary
                                                : 'transparent',
                                        }}
                                    >
                                        <Text
                                            style={TYPE.micro}
                                            className={pref === opt ? 'text-text-primary' : 'text-text-tertiary'}
                                        >
                                            {opt === 'system' ? 'Auto' : opt}
                                        </Text>
                                    </Pressable>
                                ))}
                            </View>
                        }
                    />
                    <SettingsRow
                        icon={<Bell size={16} color={COLORS.text.secondary} />}
                        label="Daily session reminder"
                        hint={reminder.enabled ? `Every day at ${formatReminderTime(reminder.hour, reminder.minute)}. Tap to change the time` : 'A daily reminder for your three-minute lesson'}
                        onPress={reminder.enabled ? () => setTimePickerOpen(true) : undefined}
                        rightElement={
                            <Switch
                                value={reminder.enabled}
                                onValueChange={(v) => { haptics.select(); toggleReminder(v); }}
                                trackColor={{ false: COLORS.border.default, true: COLORS.brand.primary }}
                                thumbColor={reminder.enabled ? COLORS.brand.primary : COLORS.text.tertiary}
                            />
                        }
                    />
                    {timePickerOpen ? (
                        <View className="px-4 py-2 border-b border-border items-center">
                            <DateTimePicker
                                value={new Date(2000, 0, 1, reminder.hour, reminder.minute)}
                                mode="time"
                                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                onChange={(event, picked) => {
                                    if (Platform.OS === 'android') setTimePickerOpen(false);
                                    if (event.type === 'dismissed' || !picked) return;
                                    changeReminderTime(picked.getHours(), picked.getMinutes());
                                }}
                            />
                            {Platform.OS === 'ios' ? (
                                <Pressable onPress={() => setTimePickerOpen(false)} accessibilityRole="button" className="py-2">
                                    <Text className="text-sm font-inter-semibold ios:font-system ios:font-semibold text-brand-link">Done</Text>
                                </Pressable>
                            ) : null}
                        </View>
                    ) : null}
                    <SettingsRow
                        icon={<Bell size={16} color={COLORS.text.secondary} />}
                        label="Budget alerts"
                        hint="A notification at 80% and again at 100% of a category's limit"
                        rightElement={
                            <Switch
                                value={notificationsEnabled}
                                onValueChange={async (v) => {
                                    setPreference({ notifications: v });
                                    // The switch is on by default for new accounts, but
                                    // nothing can be delivered until the phone has said yes.
                                    if (v && !(await ensurePermission())) {
                                        Alert.alert('Notifications are off', 'Allow notifications for FinSight in your phone settings to get budget alerts.');
                                    }
                                }}
                                trackColor={{ false: COLORS.border.default, true: COLORS.brand.primary }}
                                thumbColor={notificationsEnabled ? COLORS.brand.primary : COLORS.text.tertiary}
                            />
                        }
                    />
                    <SettingsRow
                        icon={<RefreshCw size={16} color={COLORS.text.secondary} />}
                        label="Read pasted bank messages"
                        hint="Detect amount and category from pasted bank SMS"
                        rightElement={
                            <Switch
                                value={autoTrackingEnabled}
                                onValueChange={(v) => setPreference({ autoTracking: v })}
                                trackColor={{ false: COLORS.border.default, true: COLORS.brand.primary }}
                                thumbColor={autoTrackingEnabled ? COLORS.brand.primary : COLORS.text.tertiary}
                            />
                        }
                    />
                    <SettingsRow
                        icon={<Lock size={16} color={COLORS.text.secondary} />}
                        label="Privacy and data"
                        onPress={handlePrivacy}
                    />
                    <SettingsRow
                        icon={<Upload size={16} color={COLORS.text.secondary} />}
                        label="Export your data"
                        hint="Save a copy of everything FinSight stores"
                        onPress={handleExport}
                        disabled={exporting}
                        rightElement={
                            exporting
                                ? <ActivityIndicator size="small" color={COLORS.brand.primary} />
                                : undefined
                        }
                    />
                    <SettingsRow
                        icon={<Info size={16} color={COLORS.text.secondary} />}
                        label="About FinSight"
                        hint="What this app is, and what it is not"
                        onPress={handleAbout}
                    />
                    <SettingsRow
                        icon={<Trash2 size={16} color={COLORS.semantic.loss} />}
                        label="Delete account"
                        danger
                        onPress={handleDeleteAccount}
                        disabled={deleting}
                        rightElement={
                            deleting
                                ? <ActivityIndicator size="small" color={COLORS.semantic.loss} />
                                : undefined
                        }
                    />
                </View>

                <PressableScale
                    className="mx-5 mt-4 bg-surface-primary border border-border rounded-2xl p-4 items-center"
                    onPress={handleLogout}
                    accessibilityRole="button"
                >
                    <Text className="text-base font-inter-semibold ios:font-system ios:font-semibold text-loss">Sign out</Text>
                </PressableScale>

                <View className="items-center py-6">
                    <Text className="text-xs text-text-tertiary font-inter ios:font-system">FinSight v{appVersion}</Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};
