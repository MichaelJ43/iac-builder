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
