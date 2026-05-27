"use client";

import { useEffect, useState, useMemo } from "react";
import { Search, Filter, Loader2 } from "lucide-react";
import { CourseCard } from "./CourseCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";

interface Course {
  id: string;
  courseTitle: string;
  courseCode: string;
  image?: string;
  instructor?: string;
  duration: number;
  startDate: string;
  endDate: string;
  totalFees: number;
  discountFees: number;
  discountPercentage: number;
  status: "active" | "inactive";
  notes?: string;
  createdAt: string;
}

interface EnrolledCourse {
  courseId: string;
  enrollmentId: string;
}

export function StudentCoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [enrolledCourses, setEnrolledCourses] = useState<EnrolledCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");

  // Fetch all courses
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/courses", {
          credentials: 'include',
          cache: 'no-store',
        });
        const data = await response.json();

        if (response.ok) {
          setCourses(data.courses || []);
        } else {
          toast({
            title: "Error",
            description: "Failed to load courses",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error("Error fetching courses:", error);
        toast({
          title: "Error",
          description: "An error occurred while loading courses",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    const fetchEnrolledCourses = async () => {
      try {
        const response = await fetch("/api/student/courses", {
          credentials: 'include',
          cache: 'no-store',
        });
        const data = await response.json();

        if (response.ok) {
          const enrolledCourseIds = (data.enrolledCourses as { courseId: string; enrollmentId: string }[]).map((course) => ({
            courseId: course.courseId,
            enrollmentId: course.enrollmentId,
          }));
          setEnrolledCourses(enrolledCourseIds);
        }
      } catch (error) {
        console.error("Error fetching enrolled courses:", error);
      }
    };

    fetchCourses();
    fetchEnrolledCourses();
  }, []);

  // Filter and search courses
  const filteredCourses = useMemo(() => {
    return courses.filter((course) => {
      // Status filter
      if (filterStatus !== "All" && course.status !== filterStatus.toLowerCase()) {
        return false;
      }

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          course.courseTitle.toLowerCase().includes(query) ||
          course.courseCode.toLowerCase().includes(query) ||
          (course.instructor?.toLowerCase() ?? "").includes(query)
        );
      }

      return true;
    });
  }, [courses, filterStatus, searchQuery]);

  const handleRefresh = async () => {
    try {
      setSearching(true);
      const response = await fetch("/api/student/courses", {
        credentials: 'include',
        cache: 'no-store',
      });
      const data = await response.json();

      if (response.ok) {
        const enrolledCourseIds = (data.enrolledCourses as { courseId: string; enrollmentId: string }[]).map((course) => ({
          courseId: course.courseId,
          enrollmentId: course.enrollmentId,
        }));
        setEnrolledCourses(enrolledCourseIds);
      }
    } catch (error) {
      console.error("Error refreshing enrolled courses:", error);
    } finally {
      setSearching(false);
    }
  };

  const isEnrolled = (courseId: string) => {
    return enrolledCourses.some((course) => course.courseId === courseId);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Explore Courses</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Enroll in available academy programs and expand your skills
        </p>
      </div>

      {/* Search and Filter Section */}
      <div className="card-soft space-y-3 p-4">
        <div className="grid gap-3 md:grid-cols-3 md:gap-4">
          {/* Search Bar */}
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search courses by title, code, or instructor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Courses</SelectItem>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Results Count */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            {filteredCourses.length} course{filteredCourses.length !== 1 ? "s" : ""} found
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={searching}
          >
            {searching ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Refreshing...
              </>
            ) : (
              "Refresh"
            )}
          </Button>
        </div>
      </div>

      {/* Courses Grid */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading courses...</p>
          </div>
        </div>
      ) : filteredCourses.length === 0 ? (
        <div className="card-soft flex h-48 items-center justify-center">
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              {searchQuery || filterStatus !== "All"
                ? "No courses match your search criteria"
                : "No courses available at the moment"}
            </p>
          </div>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filteredCourses.map((course) => (
            <div key={course.id} className="animate-in fade-in slide-in-from-bottom-2 duration-500">
              <CourseCard
                courseId={course.id}
                courseCode={course.courseCode}
                courseTitle={course.courseTitle}
                image={course.image}
                duration={course.duration}
                instructor={course.instructor}
                totalFees={course.totalFees}
                discountFees={course.discountFees}
                discountPercentage={course.discountPercentage}
                status={course.status}
                isEnrolled={isEnrolled(course.id)}
                onEnrollSuccess={handleRefresh}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
