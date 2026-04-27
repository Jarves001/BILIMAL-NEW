# Firebase Security Specification

## Data Invariants
1. A **User** profile can only be created by the authenticated user with matching UID.
2. **Admin** documents (in `/admins/`) can only be modified by existing admins.
3. **Courses** can only be created or modified by admins.
4. **Lessons** and **Tasks** follow the Course permissions (Master Gate: Course).
5. **Results** must strictly match the authenticated user's ID.
6. **Subscriptions** are modified by the system or admins.

## The "Dirty Dozen" Payloads

1. **Identity Spoofing**: Attempt to create a user profile for a different UID.
2. **Role Escalation**: Student attempting to update their own role to 'admin'.
3. **Ghost Fields**: Adding `isDeveloper: true` to a Subscription.
4. **Course Hijacking**: Student attempting to delete a Course.
5. **Score Injection**: User attempting to create a Result with a score higher than total questions.
6. **Result Forgery**: User A attempting to read User B's personal results.
7. **Negative Exams**: Attempting to set `examsLeft` to -5 in a Subscription.
8. **Invalid ID**: Using a 2KB string as a `courseId`.
9. **Time Travel**: Attempting to set `completedAt` to a future date instead of `request.time`.
10. **Subscription Bypass**: Accessing video lessons without a `hasVideoAccess: true` flag in subscription. (Rules will check the user's subscription doc via `get`).
11. **Orphaned Lesson**: Creating a Lesson for a `courseId` that doesn't exist.
12. **Deleted Parent Access**: Attempting to read lessons for a course that was deleted (if they had a cached ID).

## Security Test Plan
- Run tests using `firebase-tools/testing` (emulators).
- Verify PERMISSION_DENIED for all Dirty Dozen payloads.
- Verify success for legitimate flows.
