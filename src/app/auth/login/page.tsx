/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useCallback, useState, Suspense } from "react";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AppContext";

type FieldErrors = Record<string, string[] | undefined>;

function LoginForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { setUser } = useAuth();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [remember, setRemember] = useState(true);
    const [errors, setErrors] = useState<FieldErrors>({});
    const [formError, setFormError] = useState<string | null>(null);

    const fetchLogin = useCallback(async () => {
        const response = await fetch("/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ email, password, remember }),
        });
        return await response.json();
    }, [email, password, remember]);

    const loginMutation = useMutation({
        mutationFn: fetchLogin,
        onSuccess: (result) => {
            if (!result.success) {
                setErrors(result.errors ?? {});
                setFormError(result.message);
                return;
            }

            setErrors({});
            setFormError(null);
            setUser(result.user);

            const next = searchParams.get("next");
            router.replace(next && next.startsWith("/") ? next : "/");
            router.refresh();
        },
        onError: () => {
            setFormError("Something went wrong while logging in");
        },
    });

    function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setFormError(null);
        setErrors({});
        loginMutation.mutate();
    }

    const isSubmitting = loginMutation.isPending;

    return (
        <form className="_social_login_form" onSubmit={handleSubmit} noValidate>
            <div className="row">
                <div className="col-xl-12 col-lg-12 col-md-12 col-sm-12">
                    <div className="_social_login_form_input _mar_b14">
                        <label className="_social_login_label _mar_b8" htmlFor="login-email">
                            Email
                        </label>
                        <input
                            id="login-email"
                            type="email"
                            name="email"
                            autoComplete="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="form-control _social_login_input"
                            disabled={isSubmitting}
                            required
                        />
                        {errors.email?.[0] ? <small className="text-danger">{errors.email[0]}</small> : null}
                    </div>
                </div>
                <div className="col-xl-12 col-lg-12 col-md-12 col-sm-12">
                    <div className="_social_login_form_input _mar_b14">
                        <label className="_social_login_label _mar_b8" htmlFor="login-password">
                            Password
                        </label>
                        <input
                            id="login-password"
                            type="password"
                            name="password"
                            autoComplete="current-password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="form-control _social_login_input"
                            disabled={isSubmitting}
                            required
                        />
                        {errors.password?.[0] ? <small className="text-danger">{errors.password[0]}</small> : null}
                    </div>
                </div>
            </div>
            <div className="row">
                <div className="col-lg-6 col-xl-6 col-md-6 col-sm-12">
                    <div className="form-check _social_login_form_check">
                        <input
                            className="form-check-input _social_login_form_check_input"
                            type="checkbox"
                            name="remember"
                            id="flexRadioDefault2"
                            checked={remember}
                            onChange={(e) => setRemember(e.target.checked)}
                            disabled={isSubmitting}
                        />
                        <label className="form-check-label _social_login_form_check_label" htmlFor="flexRadioDefault2">
                            Remember me
                        </label>
                    </div>
                </div>
                <div className="col-lg-6 col-xl-6 col-md-6 col-sm-12">
                    <div className="_social_login_form_left">
                        <p className="_social_login_form_left_para">Forgot password?</p>
                    </div>
                </div>
            </div>
            {formError ? (
                <div className="row">
                    <div className="col-12">
                        <p className="text-danger _mar_t16 mb-0">{formError}</p>
                    </div>
                </div>
            ) : null}
            <div className="row">
                <div className="col-lg-12 col-md-12 col-xl-12 col-sm-12">
                    <div className="_social_login_form_btn _mar_t40 _mar_b60">
                        <button type="submit" className="_social_login_form_btn_link _btn1" disabled={isSubmitting}>
                            {isSubmitting ? "Logging in..." : "Login now"}
                        </button>
                    </div>
                </div>
            </div>
        </form>
    );
}

export default function LoginPage() {
    return (
        <section className="_social_login_wrapper _layout_main_wrapper">
            <div className="_shape_one">
                <img src="/assets/images/shape1.svg" alt="" className="_shape_img" />
                <img src="/assets/images/dark_shape.svg" alt="" className="_dark_shape" />
            </div>
            <div className="_shape_two">
                <img src="/assets/images/shape2.svg" alt="" className="_shape_img" />
                <img src="/assets/images/dark_shape1.svg" alt="" className="_dark_shape _dark_shape_opacity" />
            </div>
            <div className="_shape_three">
                <img src="/assets/images/shape3.svg" alt="" className="_shape_img" />
                <img src="/assets/images/dark_shape2.svg" alt="" className="_dark_shape _dark_shape_opacity" />
            </div>
            <div className="_social_login_wrap">
                <div className="container">
                    <div className="row align-items-center">
                        <div className="col-xl-8 col-lg-8 col-md-12 col-sm-12">
                            <div className="_social_login_left">
                                <div className="_social_login_left_image">
                                    <img src="/assets/images/login.png" alt="Image" className="_left_img" />
                                </div>
                            </div>
                        </div>
                        <div className="col-xl-4 col-lg-4 col-md-12 col-sm-12">
                            <div className="_social_login_content">
                                <div className="_social_login_left_logo _mar_b28">
                                    <img src="/assets/images/logo.svg" alt="Image" className="_left_logo" />
                                </div>
                                <p className="_social_login_content_para _mar_b8">Welcome back</p>
                                <h4 className="_social_login_content_title _titl4 _mar_b50">Login to your account</h4>
                                <button type="button" className="_social_login_content_btn _mar_b40">
                                    <img src="/assets/images/google.svg" alt="Image" className="_google_img" />{" "}
                                    <span>Or sign-in with google</span>
                                </button>
                                <div className="_social_login_content_bottom_txt _mar_b40">
                                    {" "}
                                    <span>Or</span>
                                </div>
                                <Suspense fallback={<div className="_social_login_form">Loading...</div>}>
                                    <LoginForm />
                                </Suspense>
                                <div className="row">
                                    <div className="col-xl-12 col-lg-12 col-md-12 col-sm-12">
                                        <div className="_social_login_bottom_txt">
                                            <p className="_social_login_bottom_txt_para">
                                                Don&apos;t have an account?{" "}
                                                <Link href="/auth/registration">Create New Account</Link>
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
