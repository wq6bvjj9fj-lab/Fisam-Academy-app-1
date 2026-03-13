#!/usr/bin/env python3

import requests
import sys
import uuid
from datetime import datetime

class FisamAPITester:
    def __init__(self, base_url="https://dojo-connect-app.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_base = f"{base_url}/api"
        self.instructor_token = None
        self.student_token = None
        self.student_id = None
        self.lesson_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []

    def run_test(self, name, method, endpoint, expected_status=200, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.api_base}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        if headers:
            test_headers.update(headers)

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return True, response.json()
                except:
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    print(f"   Response: {response.text}")
                except:
                    pass
                self.failed_tests.append(f"{name}: Expected {expected_status}, got {response.status_code}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            self.failed_tests.append(f"{name}: {str(e)}")
            return False, {}

    def test_instructor_login(self):
        """Test instructor login"""
        success, response = self.run_test(
            "Instructor Login",
            "POST",
            "auth/login",
            200,
            data={"email": "admin@fisam.it", "password": "admin123"}
        )
        if success and 'token' in response:
            self.instructor_token = response['token']
            print(f"   Got instructor token: {self.instructor_token[:20]}...")
            return True
        return False

    def test_get_instructor_profile(self):
        """Test getting instructor profile"""
        if not self.instructor_token:
            return False
        
        headers = {"Authorization": f"Bearer {self.instructor_token}"}
        success, response = self.run_test(
            "Get Instructor Profile",
            "GET",
            "auth/me",
            200,
            headers=headers
        )
        if success:
            print(f"   Instructor: {response.get('name', 'Unknown')}, Role: {response.get('role', 'Unknown')}")
        return success

    def test_create_student(self):
        """Test creating a new student"""
        if not self.instructor_token:
            return False
            
        headers = {"Authorization": f"Bearer {self.instructor_token}"}
        student_email = f"test_student_{datetime.now().strftime('%H%M%S')}@fisam.it"
        
        success, response = self.run_test(
            "Create Student",
            "POST",
            "users",
            201,
            data={
                "name": "Mario Rossi Test",
                "email": student_email,
                "password": "student123"
            },
            headers=headers
        )
        if success and 'id' in response:
            self.student_id = response['id']
            self.student_email = student_email
            print(f"   Created student with ID: {self.student_id}")
            return True
        return False

    def test_student_login(self):
        """Test student login"""
        if not hasattr(self, 'student_email'):
            return False
            
        success, response = self.run_test(
            "Student Login",
            "POST",
            "auth/login",
            200,
            data={"email": self.student_email, "password": "student123"}
        )
        if success and 'token' in response:
            self.student_token = response['token']
            print(f"   Got student token: {self.student_token[:20]}...")
            return True
        return False

    def test_list_users(self):
        """Test listing users (instructor only)"""
        if not self.instructor_token:
            return False
            
        headers = {"Authorization": f"Bearer {self.instructor_token}"}
        success, response = self.run_test(
            "List Users",
            "GET",
            "users",
            200,
            headers=headers
        )
        if success:
            print(f"   Found {len(response)} users")
        return success

    def test_create_lesson(self):
        """Test creating a lesson"""
        if not self.instructor_token:
            return False
            
        headers = {"Authorization": f"Bearer {self.instructor_token}"}
        success, response = self.run_test(
            "Create Lesson",
            "POST",
            "lessons",
            201,
            data={
                "title": "Test Kata Session",
                "date": "2024-12-15",
                "time": "18:00",
                "topics": ["Riscaldamento", "Kata Heian Shodan", "Combattimento libero"],
                "level": "Principiante"
            },
            headers=headers
        )
        if success and 'id' in response:
            self.lesson_id = response['id']
            print(f"   Created lesson with ID: {self.lesson_id}")
            return True
        return False

    def test_list_lessons(self):
        """Test listing lessons"""
        if not self.student_token:
            return False
            
        headers = {"Authorization": f"Bearer {self.student_token}"}
        success, response = self.run_test(
            "List Lessons",
            "GET",
            "lessons",
            200,
            headers=headers
        )
        if success:
            print(f"   Found {len(response)} lessons")
        return success

    def test_get_lesson_detail(self):
        """Test getting lesson details"""
        if not self.lesson_id or not self.student_token:
            return False
            
        headers = {"Authorization": f"Bearer {self.student_token}"}
        success, response = self.run_test(
            "Get Lesson Detail",
            "GET",
            f"lessons/{self.lesson_id}",
            200,
            headers=headers
        )
        if success:
            print(f"   Lesson title: {response.get('title', 'Unknown')}")
        return success

    def test_notifications_for_student(self):
        """Test notifications for student"""
        if not self.student_token:
            return False
            
        headers = {"Authorization": f"Bearer {self.student_token}"}
        success, response = self.run_test(
            "Get Student Notifications",
            "GET",
            "notifications",
            200,
            headers=headers
        )
        if success:
            print(f"   Student has {len(response)} notifications")
        return success

    def test_unread_count(self):
        """Test unread notifications count"""
        if not self.student_token:
            return False
            
        headers = {"Authorization": f"Bearer {self.student_token}"}
        success, response = self.run_test(
            "Get Unread Count",
            "GET",
            "notifications/unread-count",
            200,
            headers=headers
        )
        if success:
            print(f"   Unread count: {response.get('count', 0)}")
        return success

    def test_create_feedback(self):
        """Test creating feedback"""
        if not self.lesson_id or not self.student_token:
            return False
            
        headers = {"Authorization": f"Bearer {self.student_token}"}
        success, response = self.run_test(
            "Create Feedback",
            "POST",
            "feedback",
            201,
            data={
                "lesson_id": self.lesson_id,
                "text": "Ottima lezione! Ho imparato molto sui kata.",
                "photos": [],
                "is_private": False
            },
            headers=headers
        )
        if success:
            print(f"   Created feedback with ID: {response.get('id', 'Unknown')}")
        return success

    def test_create_private_feedback(self):
        """Test creating private feedback"""
        if not self.lesson_id or not self.student_token:
            return False
            
        headers = {"Authorization": f"Bearer {self.student_token}"}
        success, response = self.run_test(
            "Create Private Feedback",
            "POST",
            "feedback",
            201,
            data={
                "lesson_id": self.lesson_id,
                "text": "Feedback privato per l'istruttore: avrei bisogno di più aiuto con la tecnica dei pugni.",
                "photos": [],
                "is_private": True
            },
            headers=headers
        )
        if success:
            print(f"   Created private feedback with ID: {response.get('id', 'Unknown')}")
        return success

    def test_list_feedback_as_student(self):
        """Test listing feedback as student (should not see private feedback from others)"""
        if not self.student_token:
            return False
            
        headers = {"Authorization": f"Bearer {self.student_token}"}
        success, response = self.run_test(
            "List Feedback as Student",
            "GET",
            "feedback",
            200,
            headers=headers
        )
        if success:
            print(f"   Student sees {len(response)} feedback items")
            private_count = sum(1 for fb in response if fb.get('is_private', False))
            print(f"   Private feedback visible to student: {private_count}")
        return success

    def test_list_feedback_as_instructor(self):
        """Test listing feedback as instructor (should see all feedback including private)"""
        if not self.instructor_token:
            return False
            
        headers = {"Authorization": f"Bearer {self.instructor_token}"}
        success, response = self.run_test(
            "List Feedback as Instructor",
            "GET",
            "feedback",
            200,
            headers=headers
        )
        if success:
            print(f"   Instructor sees {len(response)} feedback items")
            private_count = sum(1 for fb in response if fb.get('is_private', False))
            print(f"   Private feedback visible to instructor: {private_count}")
        return success

    def test_unauthorized_access(self):
        """Test unauthorized access to protected endpoints"""
        success, _ = self.run_test(
            "Unauthorized Access",
            "GET",
            "lessons",
            401
        )
        return success

    def test_student_cannot_create_users(self):
        """Test that students cannot create other users"""
        if not self.student_token:
            return False
            
        headers = {"Authorization": f"Bearer {self.student_token}"}
        success, _ = self.run_test(
            "Student Cannot Create Users",
            "POST",
            "users",
            403,
            data={
                "name": "Unauthorized User",
                "email": "unauthorized@test.com",
                "password": "test123"
            },
            headers=headers
        )
        return success

    def cleanup_test_data(self):
        """Clean up test data"""
        if self.student_id and self.instructor_token:
            headers = {"Authorization": f"Bearer {self.instructor_token}"}
            print(f"\n🧹 Cleaning up test student...")
            success, _ = self.run_test(
                "Delete Test Student",
                "DELETE",
                f"users/{self.student_id}",
                200,
                headers=headers
            )
            if success:
                print("   Test student deleted successfully")

def main():
    print("🥋 FISAM Academy API Testing Started")
    print("=" * 50)
    
    tester = FisamAPITester()
    
    # Test sequence
    test_sequence = [
        # Authentication tests
        tester.test_instructor_login,
        tester.test_get_instructor_profile,
        
        # User management tests
        tester.test_create_student,
        tester.test_student_login,
        tester.test_list_users,
        
        # Lesson tests
        tester.test_create_lesson,
        tester.test_list_lessons,
        tester.test_get_lesson_detail,
        
        # Notification tests
        tester.test_notifications_for_student,
        tester.test_unread_count,
        
        # Feedback tests
        tester.test_create_feedback,
        tester.test_create_private_feedback,
        tester.test_list_feedback_as_student,
        tester.test_list_feedback_as_instructor,
        
        # Security tests
        tester.test_unauthorized_access,
        tester.test_student_cannot_create_users,
    ]
    
    # Run all tests
    for test_func in test_sequence:
        if not test_func():
            print(f"❌ Critical test failed: {test_func.__name__}")
    
    # Clean up
    tester.cleanup_test_data()
    
    # Print summary
    print("\n" + "=" * 50)
    print("📊 Test Summary")
    print(f"Tests run: {tester.tests_run}")
    print(f"Tests passed: {tester.tests_passed}")
    print(f"Tests failed: {tester.tests_run - tester.tests_passed}")
    print(f"Success rate: {(tester.tests_passed/tester.tests_run*100):.1f}%")
    
    if tester.failed_tests:
        print("\n❌ Failed Tests:")
        for failed in tester.failed_tests:
            print(f"  - {failed}")
    
    return 0 if tester.tests_passed == tester.tests_run else 1

if __name__ == "__main__":
    sys.exit(main())