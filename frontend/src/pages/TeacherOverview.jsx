import { useEffect, useState } from "react";
import { IconBooks, IconUsers, IconFileCheck, IconClockExclamation, IconFolderOpen } from "@tabler/icons-react";
import { listCourses, getEnrollments, getMaterials } from "../api/courses";
import { listQuizzesForCourse, getPendingGrades } from "../api/quizzes";
import { StatCard, Card, CourseCard, Button, EmptyState, LoadingState } from "../components/ui";

export default function TeacherOverview({ onNavigate }) {
  const [stats, setStats] = useState(null);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const [courseList, pending] = await Promise.all([listCourses(), getPendingGrades()]);
        const [enrollmentCounts, quizCounts, materialCounts] = await Promise.all([
          Promise.all(courseList.map((c) => getEnrollments(c._id).then((e) => e.length).catch(() => 0))),
          Promise.all(courseList.map((c) => listQuizzesForCourse(c._id).then((q) => q.length).catch(() => 0))),
          Promise.all(courseList.map((c) => getMaterials(c._id).then((m) => m.length).catch(() => 0))),
        ]);
        setStats({
          courses: courseList.length,
          students: enrollmentCounts.reduce((a, b) => a + b, 0),
          quizzes: quizCounts.reduce((a, b) => a + b, 0),
          pendingGrades: pending.length,
        });
        setCourses(
          courseList.slice(0, 5).map((c, i) => ({
            ...c,
            studentCount: enrollmentCounts[i],
            quizCount: quizCounts[i],
            materialCount: materialCounts[i],
          }))
        );
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load dashboard");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <LoadingState />;
  if (error) return <p className="text-xs text-badge-red-text">{error}</p>;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-4 gap-4">
        <StatCard label="My Courses" value={stats.courses} icon={IconBooks} tone="blue" />
        <StatCard label="Enrolled Students" value={stats.students} icon={IconUsers} tone="navy" />
        <StatCard label="Quizzes Created" value={stats.quizzes} icon={IconFileCheck} tone="success" />
        <StatCard
          label="Pending Grades"
          value={stats.pendingGrades}
          icon={IconClockExclamation}
          tone={stats.pendingGrades > 0 ? "amber" : "success"}
        />
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-[15px] font-bold text-navy">My Courses</h2>
        <Button variant="secondary" size="sm" onClick={() => onNavigate?.("My Courses")}>
          View All
        </Button>
      </div>

      {courses.length === 0 ? (
        <Card>
          <EmptyState icon="📚" title="No courses assigned yet" subtitle="Courses you're assigned to teach will show up here." />
        </Card>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">
          {courses.map((c) => (
            <CourseCard
              key={c._id}
              code={c.code}
              name={c.title}
              subtitle={c.description}
              onClick={() => onNavigate?.("My Courses")}
              stats={[
                { label: "Students", value: c.studentCount },
                { label: "Materials", value: c.materialCount },
                { label: "Quizzes", value: c.quizCount },
              ]}
              actions={
                <Button
                  size="sm"
                  className="w-full justify-center"
                  onClick={(e) => {
                    e.stopPropagation();
                    onNavigate?.("My Courses");
                  }}
                >
                  <IconFolderOpen size={15} />
                  Open
                </Button>
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
