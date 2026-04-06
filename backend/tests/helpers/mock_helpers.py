# This module provides helper classes and functions 
# to create fake database connections and cursors for unit testing purposes.

# The FakeCursor class simulates a database cursor, allowing you to specify 
# the results of fetchone and fetchall operations, as well as track executed queries.
class FakeCursor:
    def __init__(self, fetchone_result=None, fetchall_result=None):
        self.fetchone_result = fetchone_result
        self.fetchall_result = fetchall_result or []
        self.executed = []
        self.closed = False

    def execute(self, query, params=None):
        self.executed.append((query, params))

    def fetchone(self):
        return self.fetchone_result

    def fetchall(self):
        return self.fetchall_result

    def close(self):
        self.closed = True

# The FakeConnection class simulates a database connection, allowing you to
# track commits and closures. It uses a FakeCursor to simulate cursor behavior.
class FakeConnection:
    def __init__(self, cursor):
        self._cursor = cursor
        self.committed = False
        self.closed = False

    def cursor(self):
        return self._cursor

    def commit(self):
        self.committed = True

    def close(self):
        self.closed = True

# The make_fake_db function creates a fake database connection and cursor 
# with specified results for fetchone and fetchall operations. 
def make_fake_db(fetchone_result=None, fetchall_result=None):
    cursor = FakeCursor(fetchone_result=fetchone_result, fetchall_result=fetchall_result)
    conn = FakeConnection(cursor)
    return conn, cursor
