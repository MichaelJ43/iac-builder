package store

import (
	"context"
	"testing"

	"github.com/MichaelJ43/iac-builder/api/internal/crypto"
)

func TestCreateProfileUserScopedList(t *testing.T) {
	mk, err := crypto.ParseMasterKey("0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f20")
	if err != nil {
		t.Fatal(err)
	}
	s, err := OpenSQLite("file::memory:?cache=shared", mk)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = s.Close() })
	ctx := context.Background()
	_, err = s.CreateProfile(ctx, "alice", "p1", "aws", "us-east-1", AWSCreds{AccessKeyID: "A", SecretAccessKey: "B"})
	if err != nil {
		t.Fatal(err)
	}
	_, err = s.CreateProfile(ctx, "bob", "p1", "aws", "eu-west-1", AWSCreds{AccessKeyID: "C", SecretAccessKey: "D"})
	if err != nil {
		t.Fatal(err)
	}
	la, err := s.ListProfiles(ctx, "alice", false)
	if err != nil || len(la) != 1 {
		t.Fatalf("alice list: %d %v", len(la), err)
	}
	all, err := s.ListProfiles(ctx, "", true)
	if err != nil || len(all) != 2 {
		t.Fatalf("all list: %d %v", len(all), err)
	}
}

func TestGetAWSCredsEnforceUser(t *testing.T) {
	mk, _ := crypto.ParseMasterKey("0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f20")
	s, err := OpenSQLite("file::memory:?cache=shared", mk)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = s.Close() })
	ctx := context.Background()
	id, err := s.CreateProfile(ctx, "u1", "k", "aws", "us-east-1", AWSCreds{AccessKeyID: "A", SecretAccessKey: "B"})
	if err != nil {
		t.Fatal(err)
	}
	_, _, err = s.GetAWSCreds(ctx, id, "wrong", true)
	if err == nil {
		t.Fatal("expected error for wrong user")
	}
	c, r, err := s.GetAWSCreds(ctx, id, "u1", true)
	if err != nil || c.AccessKeyID != "A" || r == "" {
		t.Fatalf("creds: %v", err)
	}
}

func TestDeleteProfileEnforceUser(t *testing.T) {
	mk, _ := crypto.ParseMasterKey("0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f20")
	s, err := OpenSQLite("file::memory:?cache=shared", mk)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = s.Close() })
	ctx := context.Background()
	id, err := s.CreateProfile(ctx, "u1", "k", "aws", "us-east-1", AWSCreds{AccessKeyID: "A", SecretAccessKey: "B"})
	if err != nil {
		t.Fatal(err)
	}
	n, err := s.DeleteProfile(ctx, id, "wrong", true)
	if err != nil {
		t.Fatal(err)
	}
	if n != 0 {
		t.Fatalf("expected 0 rows, got %d", n)
	}
	n, err = s.DeleteProfile(ctx, id, "u1", true)
	if err != nil || n != 1 {
		t.Fatalf("delete: n=%d err=%v", n, err)
	}
	n, err = s.DeleteProfile(ctx, id, "u1", true)
	if err != nil || n != 0 {
		t.Fatalf("second delete: n=%d err=%v", n, err)
	}
}

func TestUserOpenAIKeyRoundTrip(t *testing.T) {
	mk, _ := crypto.ParseMasterKey("0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f20")
	s, err := OpenSQLite("file::memory:?cache=shared", mk)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = s.Close() })
	ctx := context.Background()
	k, err := s.GetUserOpenAIKey(ctx, "u1")
	if err != nil || k != "" {
		t.Fatalf("empty: k=%q err=%v", k, err)
	}
	if err := s.SetUserOpenAIKey(ctx, "u1", "sk-test1234567890123456"); err != nil {
		t.Fatal(err)
	}
	k2, err := s.GetUserOpenAIKey(ctx, "u1")
	if err != nil || k2 != "sk-test1234567890123456" {
		t.Fatalf("get: %q %v", k2, err)
	}
	h, err := s.KeyHintLast4(ctx, "u1")
	if err != nil || h != "3456" {
		t.Fatalf("hint: %q %v", h, err)
	}
	n, err := s.DeleteUserOpenAIKey(ctx, "u1")
	if err != nil || n != 1 {
		t.Fatalf("delete: n=%d %v", n, err)
	}
}
