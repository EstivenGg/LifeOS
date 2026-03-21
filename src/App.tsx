import { Routes, Route } from 'react-router-dom'
import { Layout } from './components/Layout'
import { Dashboard } from './features/dashboard/Dashboard'
import { DayLog } from './features/daylog/DayLog'
import { CalendarView } from './features/calendar/CalendarView'
import { HabitsPage } from './features/habits/HabitsPage'
import { BooksPage } from './features/books/BooksPage'
import { MediaPage } from './features/media/MediaPage'
import { WorkoutsPage } from './features/workouts/WorkoutsPage'
import { SleepPage } from './features/sleep/SleepPage'
import { StudyPage } from './features/study/StudyPage'
import { WeightPage } from './features/weight/WeightPage'
import { PomodoroPage } from './features/pomodoro/PomodoroPage'
import { ScreenTimePage } from './features/screentime/ScreenTimePage'
import { ExportPage } from './features/export/ExportPage'
import { InsightsPage } from './features/insights/InsightsPage'
import { TasksPage } from './features/tasks/TasksPage'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/daylog" element={<DayLog />} />
        <Route path="/daylog/:date" element={<DayLog />} />
        <Route path="/calendar" element={<CalendarView />} />
        <Route path="/habits" element={<HabitsPage />} />
        <Route path="/books" element={<BooksPage />} />
        <Route path="/media" element={<MediaPage />} />
        <Route path="/workouts" element={<WorkoutsPage />} />
        <Route path="/sleep" element={<SleepPage />} />
        <Route path="/study" element={<StudyPage />} />
        <Route path="/weight" element={<WeightPage />} />
        <Route path="/pomodoro" element={<PomodoroPage />} />
        <Route path="/screentime" element={<ScreenTimePage />} />
        <Route path="/export" element={<ExportPage />} />
        <Route path="/tasks" element={<TasksPage />} />
        <Route path="/insights" element={<InsightsPage />} />
      </Route>
    </Routes>
  )
}
