import subprocess

with open("test_results.txt", "w", encoding="utf-8") as f:
    subprocess.run(["python", "-m", "pytest", "tests/", "-v", "--tb=short"], stdout=f, stderr=subprocess.STDOUT)
print("Tests finished running, results enclosed in test_results.txt.")
